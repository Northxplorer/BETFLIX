import json
import copy
import http.server
import socketserver
import os
import sys
import threading
import time
import subprocess
import platform
import traceback
import tkinter as tk
from tkinter import ttk, messagebox
from urllib.parse import urlparse, parse_qs
from datetime import datetime
import re

# Use standard library webbrowser as a fallback if subprocess fails
import webbrowser

# Configuration
PORT = 8000
DIRECTORY = "web"  # frontend build (npm run build), bundled into the .exe

# In a windowed PyInstaller exe (no console) sys.stdout / sys.stderr are None.
# http.server logs every request to stderr: writing to None crashed the
# request handler, and the browser got an empty response (ERR_EMPTY_RESPONSE).
if sys.stdout is None:
    sys.stdout = open(os.devnull, 'w')
if sys.stderr is None:
    sys.stderr = open(os.devnull, 'w')

# Global state for online presence
online_users = {} # { "user_id": timestamp }

# Determine path where the executable/script is running
if getattr(sys, 'frozen', False):
    # If running as bundled executable
    APPLICATION_PATH = os.path.dirname(sys.executable)
    # The bundled resources (dist) are in the temp folder _MEIPASS
    RESOURCE_PATH = sys._MEIPASS
else:
    # If running as script
    APPLICATION_PATH = os.path.dirname(os.path.abspath(__file__))
    RESOURCE_PATH = APPLICATION_PATH

# --- CONFIGURATION DU CHEMIN DES DONNÉES ---
# DATA_PATH = os.path.join(APPLICATION_PATH, "dashboard_data.json")
# PROJECTS_ROOT = os.path.join(APPLICATION_PATH, "Betic_Test")

# Production Paths
DATA_PATH = r"Q:\BETIC\Users\olivier Schwickert\dashboard T2\dashboard_data.json"
PROJECTS_ROOT = r"Q:\BETIC"
LOCK_FILE = DATA_PATH + ".lock"
USERS_ROOT = r"Q:\BETIC\Users"
# Shared presence folder: each client writes one small file per user, so that
# everybody sees who is online even though each person runs their own server.
PRESENCE_DIR = os.path.join(os.path.dirname(DATA_PATH), "presence")
PRESENCE_TIMEOUT = 120  # seconds
# -------------------------------------------

DEFAULT_DATA = {
    "users": [
        {"id": "1", "name": "Alice", "workload": 50, "role": "Manager"},
        {"id": "2", "name": "Bob", "workload": 80, "role": "Développeur"}
    ],
    "projects": [],
    "chat": [],
    "pings": []
}

def log_error(msg):
    log_path = os.path.join(APPLICATION_PATH, "dashboard_error.log")
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(f"[{datetime.now()}] {msg}\n")

def ensure_data_directory():
    """Ensures the directory for DATA_PATH exists."""
    try:
        data_dir = os.path.dirname(DATA_PATH)
        if not os.path.exists(data_dir):
            os.makedirs(data_dir)
    except Exception as e:
        log_error(f"Error ensuring data directory: {e}")

def write_data(data):
    """Writes the data file atomically (temp file + rename) so a crash or a
    network hiccup never leaves a half-written JSON on the share."""
    tmp_path = DATA_PATH + ".tmp"
    with open(tmp_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    os.replace(tmp_path, DATA_PATH)

def read_data_for_write():
    """Reads the data file before a modification.
    Returns a fresh default structure if the file does not exist yet, but RAISES
    if the file exists and cannot be read: saving on top of defaults would wipe
    every project of the team."""
    if not os.path.exists(DATA_PATH):
        return copy.deepcopy(DEFAULT_DATA)
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    for key in ("users", "projects", "chat", "pings"):
        data.setdefault(key, [])
    return data

def load_data():
    if not os.path.exists(DATA_PATH):
        try:
            ensure_data_directory()
            write_data(DEFAULT_DATA)
        except Exception as e:
            log_error(f"Error creating default data file: {e}")
        return copy.deepcopy(DEFAULT_DATA)
    try:
        with open(DATA_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # Ensure arrays exist for older data files
            for key in ("users", "projects", "chat", "pings"):
                data.setdefault(key, [])
            return data
    except Exception as e:
        log_error(f"Error loading data: {e}")
        return copy.deepcopy(DEFAULT_DATA)

def acquire_lock(timeout=5.0):
    """File-based lock. The lock file is created with O_CREAT | O_EXCL, which is
    atomic: two clients can never both believe they hold the lock."""
    start_time = time.time()
    while True:
        try:
            fd = os.open(LOCK_FILE, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            try:
                os.write(fd, str(os.getpid()).encode())
            finally:
                os.close(fd)
            return True
        except FileExistsError:
            # Check for stale lock (older than 10 seconds)
            try:
                if time.time() - os.path.getmtime(LOCK_FILE) > 10:
                    os.remove(LOCK_FILE)
                    continue
            except OSError:
                pass
        except OSError:
            pass

        if time.time() - start_time > timeout:
            return False
        time.sleep(0.1)

def release_lock():
    try:
        if os.path.exists(LOCK_FILE):
            os.remove(LOCK_FILE)
    except Exception:
        pass

def save_data(new_data):
    """
    Saves data with locking and rudimentary merging to prevent overwriting
    concurrent changes to other projects.
    """
    if not acquire_lock():
        log_error("Could not acquire lock for saving.")
        return False

    try:
        ensure_data_directory()

        # 1. Load current data from disk (source of truth). Raises if corrupt.
        current_disk_data = read_data_for_write()

        # 2. Merge Strategies: fields missing from the request keep the disk value
        final_users = new_data.get("users", current_disk_data.get("users", []))
        final_chat = new_data.get("chat", current_disk_data.get("chat", []))
        final_pings = new_data.get("pings", current_disk_data.get("pings", []))

        # C. Projects: The Critical Part
        disk_projects = {p["id"]: p for p in current_disk_data.get("projects", [])}
        new_projects = {p["id"]: p for p in new_data.get("projects", [])}

        final_projects_map = {}

        # 1. Update/Add projects from the incoming request (the user's changes)
        for pid, p_data in new_projects.items():
            final_projects_map[pid] = p_data

        # 2. Restore projects that are on disk but MISSING in new_data
        for pid, p_data in disk_projects.items():
            if pid not in final_projects_map:
                final_projects_map[pid] = p_data

        # Convert back to list
        final_projects_list = list(final_projects_map.values())

        # Construct final data object
        final_data = {
            "users": final_users,
            "projects": final_projects_list,
            "chat": final_chat,
            "pings": final_pings
        }

        # 3. Write to disk
        write_data(final_data)

        return True
    except Exception as e:
        log_error(f"Error saving data: {e}")
        return False
    finally:
        release_lock()


# Fields edited collaboratively, merged server-side (never overwritten wholesale)
COLLAB_FIELDS = ("likes", "comments", "pinnedBy")

def _normalize_likes(likes, fallback_date):
    """Legacy likes were plain user ids; the current format is {userId, date}."""
    result = []
    for like in likes or []:
        if isinstance(like, dict):
            if like.get("userId"):
                result.append(like)
        elif like:
            result.append({"userId": str(like), "date": fallback_date})
    return result

def _normalize_pins(project, users):
    """Pins used to be a single global flag `pinned`. The current format is a
    per-user list `pinnedBy`. A legacy pinned project stays pinned for everyone
    until each person removes it from their own list."""
    if "pinnedBy" not in project:
        project["pinnedBy"] = [str(u.get("id")) for u in users] if project.get("pinned") else []
    project.pop("pinned", None)

def apply_project_action(data, project_id, action, payload):
    """Applies one small collaborative change to a project. Returns the updated
    project, or None if the project does not exist."""
    project = next((p for p in data.get("projects", []) if p.get("id") == project_id), None)
    if project is None:
        return None

    now = datetime.now().isoformat()
    user_id = str(payload.get("userId", ""))
    project["likes"] = _normalize_likes(project.get("likes"), project.get("lastUpdated") or now)
    project.setdefault("comments", [])
    _normalize_pins(project, data.get("users", []))

    if action == "toggle-like" and user_id:
        if any(l["userId"] == user_id for l in project["likes"]):
            project["likes"] = [l for l in project["likes"] if l["userId"] != user_id]
        else:
            project["likes"].append({"userId": user_id, "date": now})

    elif action == "toggle-pin" and user_id:
        if user_id in project["pinnedBy"]:
            project["pinnedBy"] = [u for u in project["pinnedBy"] if u != user_id]
        else:
            project["pinnedBy"].append(user_id)

    elif action == "add-comment":
        comment = payload.get("comment") or {}
        if comment.get("id") and not any(c.get("id") == comment["id"] for c in project["comments"]):
            comment.setdefault("likes", [])
            project["comments"].append(comment)

    elif action == "edit-comment":
        for c in project["comments"]:
            if c.get("id") == payload.get("commentId"):
                c["text"] = payload.get("text", c.get("text", ""))

    elif action == "delete-comment":
        project["comments"] = [c for c in project["comments"] if c.get("id") != payload.get("commentId")]

    elif action == "toggle-comment-like" and user_id:
        for c in project["comments"]:
            if c.get("id") == payload.get("commentId"):
                likes = [str(x) for x in c.get("likes", [])]
                c["likes"] = [x for x in likes if x != user_id] if user_id in likes else likes + [user_id]

    else:
        raise ValueError(f"Unknown action: {action}")

    return project

def update_favorite_file(user_name, user_id, project):
    """Keeps a personal copy, in Q:\\BETIC\\Users\\<name>\\dashboard T2\\, of the
    projects this user pinned or liked."""
    user_dir = os.path.join(USERS_ROOT, user_name, "dashboard T2")
    os.makedirs(user_dir, exist_ok=True)
    user_file_path = os.path.join(user_dir, "dashboard_data.json")

    user_data = {"projects": []}
    if os.path.exists(user_file_path):
        try:
            with open(user_file_path, 'r', encoding='utf-8') as f:
                user_data = json.load(f)
        except Exception:
            pass
    user_data.setdefault("projects", [])

    user_id = str(user_id)
    likes = project.get("likes", [])
    is_liked = any((l.get("userId") if isinstance(l, dict) else str(l)) == user_id for l in likes)
    is_pinned = user_id in [str(u) for u in project.get("pinnedBy", [])]

    others = [p for p in user_data["projects"] if p.get("id") != project.get("id")]
    user_data["projects"] = others + [project] if (is_liked or is_pinned) else others

    with open(user_file_path, 'w', encoding='utf-8') as f:
        json.dump(user_data, f, ensure_ascii=False, indent=2)

def save_project(project_data):
    if not acquire_lock():
        log_error("Could not acquire lock for saving project.")
        return False
    try:
        ensure_data_directory()
        data = read_data_for_write()
        
        projects = data.get("projects", [])
        existing_idx = next((i for i, p in enumerate(projects) if p.get("id") == project_data.get("id")), -1)
        
        if existing_idx >= 0:
            # Likes, comments and pins are managed only through /api/project-action.
            # Keep the disk version so a stale copy of the project (opened minutes
            # ago on another PC) can never erase someone else's comment or like.
            existing = projects[existing_idx]
            _normalize_pins(existing, data.get("users", []))  # keep legacy pins
            merged = dict(project_data)
            for key in COLLAB_FIELDS:
                if key in existing:
                    merged[key] = existing[key]
            merged.pop("pinned", None)
            projects[existing_idx] = merged
        else:
            projects.append(project_data)

        data["projects"] = projects

        write_data(data)
        return True
    except Exception as e:
        log_error(f"Error saving project: {e}")
        return False
    finally:
        release_lock()

def save_user(user_data):
    if not acquire_lock():
        log_error("Could not acquire lock for saving user.")
        return False
    try:
        ensure_data_directory()
        data = read_data_for_write()
        
        users = data.get("users", [])
        existing_idx = next((i for i, u in enumerate(users) if u.get("id") == user_data.get("id")), -1)
        
        if existing_idx >= 0:
            users[existing_idx] = user_data
        else:
            users.append(user_data)
            
        data["users"] = users
        
        write_data(data)
        return True
    except Exception as e:
        log_error(f"Error saving user: {e}")
        return False
    finally:
        release_lock()

def delete_project_by_id(project_id):
    """Explicitly deletes a project by ID."""
    if not acquire_lock():
        log_error("Could not acquire lock for deletion.")
        return False

    try:
        if not os.path.exists(DATA_PATH):
            log_error(f"Data file not found at: {DATA_PATH}")
            return False

        data = read_data_for_write()

        original_count = len(data.get("projects", []))
        data["projects"] = [p for p in data.get("projects", []) if p["id"] != project_id]

        if len(data["projects"]) == original_count:
            # Nothing was deleted, but we shouldn't fail
            # log_error(f"Project ID {project_id} not found for deletion.")
            pass

        write_data(data)

        return True
    except Exception as e:
        log_error(f"Error deleting project: {e}\n{traceback.format_exc()}")
        return False
    finally:
        release_lock()

def _presence_file(user_id):
    safe_id = re.sub(r'[^A-Za-z0-9_-]', '_', user_id)
    return os.path.join(PRESENCE_DIR, f"{safe_id}.json")

def record_presence(user_id):
    """Marks a user as online, both locally and in the shared presence folder."""
    now = time.time()
    online_users[user_id] = now
    try:
        os.makedirs(PRESENCE_DIR, exist_ok=True)
        with open(_presence_file(user_id), 'w', encoding='utf-8') as f:
            json.dump({"userId": user_id, "lastSeen": now}, f)
    except Exception as e:
        log_error(f"Error recording presence: {e}")

def get_online_users():
    """Users seen within PRESENCE_TIMEOUT, across every client sharing the Q: folder."""
    now = time.time()
    active = {uid for uid, last_seen in online_users.items() if now - last_seen < PRESENCE_TIMEOUT}
    try:
        if os.path.isdir(PRESENCE_DIR):
            for entry in os.scandir(PRESENCE_DIR):
                if not entry.name.endswith(".json"):
                    continue
                try:
                    with open(entry.path, 'r', encoding='utf-8') as f:
                        info = json.load(f)
                    if now - float(info.get("lastSeen", 0)) < PRESENCE_TIMEOUT:
                        active.add(str(info.get("userId")))
                except Exception:
                    pass  # file being written by another client, skip it
    except Exception as e:
        log_error(f"Error reading presence: {e}")
    return list(active)

def open_folder(path):
    """Opens a folder in the OS file explorer."""
    # Clean up quotes if present
    path = path.strip('"\'')
    path = os.path.normpath(path)
    
    if not os.path.exists(path):
        return False, f"Path does not exist: {path}"

    if not os.path.isdir(path):
        return False, f"Path is not a directory: {path}"

    try:
        if platform.system() == "Windows":
            # Some paths with spaces or weird characters fail with os.startfile on some systems.
            # Explorer is a safer fallback.
            subprocess.Popen(['explorer', path])
            # Optional: try to force focus using a small powershell script if needed,
            # but os.startfile usually handles it well.
            # Adding a backup focus attempt if users report issues.
            # subprocess.Popen(f'powershell -command "(New-Object -ComObject WScript.Shell).AppActivate(\'{os.path.basename(path)}\')"', shell=True)
        elif platform.system() == "Darwin":  # macOS
            subprocess.Popen(["open", path])
        else:  # Linux
            subprocess.Popen(["xdg-open", path])
        return True, "Opened successfully"
    except Exception as e:
        return False, str(e)

def search_betic_folder(query):
    # Searches for a project folder in the Betic structure (Q:\BETIC\20YY\YY-XXX).
    match = re.match(r'^(\d{2})[._-](\d{3})$', query)
    if not match:
        return None

    year_short = match.group(1) # '23'
    project_num = match.group(2) # '169'
    full_year = f"20{year_short}" # '2023'

    candidates = [
        f"{year_short}-{project_num}",
        f"{year_short}.{project_num}",
        f"{year_short}_{project_num}",
        f"{year_short} {project_num}"
    ]

    found_path = None
    for c in candidates:
        target_path = os.path.join(PROJECTS_ROOT, full_year, c)
        if os.path.isdir(target_path):
            found_path = target_path
            break
            
    if not found_path:
        year_folder = os.path.join(PROJECTS_ROOT, full_year)
        if os.path.isdir(year_folder):
            try:
                for entry in os.scandir(year_folder):
                    if entry.is_dir():
                        for c in candidates:
                            if entry.name.startswith(c):
                                found_path = entry.path
                                break
                    if found_path: break
            except: pass

    if found_path:
        contacts = []
        try:
            # Let's try to find vcf or contact lists
            for root, dirs, files in os.walk(found_path):
                for f in files:
                    if f.lower().endswith(('.vcf', '.csv', '.xlsx')) and 'contact' in f.lower():
                        contacts.append(f)
                break # only check root folder of project to save time
        except: pass
        
        return {
            "path": found_path,
            "contacts": contacts,
            "name": os.path.basename(found_path)
        }
    return None

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        dist_path = os.path.join(RESOURCE_PATH, DIRECTORY)
        super().__init__(*args, directory=dist_path, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "X-Requested-With, Content-type")
        self.end_headers()

    def do_GET(self):
        parsed_path = urlparse(self.path)
        if parsed_path.path == '/api/data':
            try:
                data = load_data()
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(data).encode('utf-8'))
            except Exception as e:
                self.send_error(500, str(e))
        elif parsed_path.path == '/api/online-users':
            try:
                active_users = get_online_users()
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(active_users).encode('utf-8'))
            except Exception as e:
                self.send_error(500, str(e))
        elif parsed_path.path == '/api/chat':
            try:
                data = load_data()
                chat = data.get("chat", [])
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(chat[-50:]).encode('utf-8'))
            except Exception as e:
                self.send_error(500, str(e))
        elif parsed_path.path == '/api/pings':
            # Lightweight endpoint polled often by the frontend for team pings
            try:
                data = load_data()
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(data.get("pings", [])).encode('utf-8'))
            except Exception as e:
                self.send_error(500, str(e))
        else:
            super().do_GET()

    def do_POST(self):
        parsed_path = urlparse(self.path)
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)

        if parsed_path.path == '/api/ping':
            try:
                payload = json.loads(post_data.decode('utf-8'))
                user_id = payload.get("userId")
                if user_id:
                    record_presence(str(user_id))
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))
            except Exception as e:
                self.send_error(400, f"Error: {str(e)}")

        elif parsed_path.path == '/api/save':
            try:
                new_data = json.loads(post_data.decode('utf-8'))
                if save_data(new_data):
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))
                else:
                    self.send_error(500, "Failed to save data")
            except Exception as e:
                self.send_error(400, f"Error: {str(e)}")
                
        elif parsed_path.path == '/api/send-ping':
            try:
                ping_data = json.loads(post_data.decode('utf-8'))
                if not acquire_lock():
                    self.send_error(500, "Lock error")
                    return
                try:
                    data = read_data_for_write()
                    data["pings"].append(ping_data)
                    # Keep only last 20 pings
                    if len(data["pings"]) > 20:
                        data["pings"] = data["pings"][-20:]
                    
                    write_data(data)
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))
                finally:
                    release_lock()
            except Exception as e:
                self.send_error(400, f"Error: {str(e)}")

        elif parsed_path.path == '/api/save-project':
            try:
                project_data = json.loads(post_data.decode('utf-8'))
                if save_project(project_data):
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))
                else:
                    self.send_error(500, "Failed to save project")
            except Exception as e:
                self.send_error(400, f"Error: {str(e)}")

        elif parsed_path.path == '/api/save-user':
            try:
                user_data = json.loads(post_data.decode('utf-8'))
                if save_user(user_data):
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))
                else:
                    self.send_error(500, "Failed to save user")
            except Exception as e:
                self.send_error(400, f"Error: {str(e)}")

        elif parsed_path.path == '/api/project-action':
            # Small collaborative changes (like, pin, comments) merged under the
            # lock into the latest version on disk. Returns the updated project.
            try:
                payload = json.loads(post_data.decode('utf-8'))
                if not acquire_lock():
                    self.send_error(503, "Lock error")
                    return
                try:
                    data = read_data_for_write()
                    project = apply_project_action(data, payload.get("projectId"), payload.get("action"), payload)
                    if project is not None:
                        write_data(data)
                finally:
                    release_lock()

                if project is None:
                    self.send_error(404, "Project not found")
                    return

                # Personal favorites copy (outside the lock: it's a per-user file)
                if payload.get("action") in ("toggle-like", "toggle-pin") and payload.get("userName"):
                    try:
                        update_favorite_file(payload["userName"], payload.get("userId", ""), project)
                    except Exception as e:
                        log_error(f"Error updating favorites: {e}")

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(project).encode('utf-8'))
            except ValueError as e:
                self.send_error(400, str(e))
            except Exception as e:
                log_error(f"Error in project action: {e}\n{traceback.format_exc()}")
                self.send_error(500, str(e))

        elif parsed_path.path == '/api/save-favorite':
            try:
                payload = json.loads(post_data.decode('utf-8'))
                user_name = payload.get('userName')
                project = payload.get('project')
                if not user_name or not project:
                    self.send_error(400, "Missing user_name or project")
                    return
                update_favorite_file(user_name, payload.get("userId", ""), project)

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))
            except Exception as e:
                self.send_error(500, str(e))

        elif parsed_path.path == '/api/chat':
            try:
                msg = json.loads(post_data.decode('utf-8'))
                if not acquire_lock():
                    self.send_error(500, "Lock error")
                    return
                try:
                    # Read + append + write under the same lock, otherwise a
                    # concurrent save could be lost.
                    data = read_data_for_write()
                    data["chat"].append(msg)
                    if len(data["chat"]) > 200:
                        data["chat"] = data["chat"][-200:]
                    write_data(data)
                finally:
                    release_lock()
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))
            except Exception as e:
                self.send_error(500, str(e))

        elif parsed_path.path == '/api/open-folder':
            try:
                payload = json.loads(post_data.decode('utf-8'))
                path = payload.get("path")
                if not path:
                    self.send_error(400, "Missing path")
                    return
                success, msg = open_folder(path)
                if success:
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))
                else:
                    self.send_error(404, msg)
            except Exception as e:
                self.send_error(500, str(e))

        elif parsed_path.path == '/api/check-folder':
            try:
                payload = json.loads(post_data.decode('utf-8'))
                ref = payload.get("ref")
                folder_info = search_betic_folder(ref)
                if folder_info:
                    response = {
                        "exists": True,
                        "path": folder_info["path"],
                        "name": folder_info["name"],
                        "contacts": folder_info["contacts"]
                    }
                else:
                    response = {
                        "exists": False,
                        "path": "",
                        "name": "",
                        "contacts": []
                    }
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode('utf-8'))
            except Exception as e:
                self.send_error(500, str(e))

        elif parsed_path.path == '/api/delete-project':
            try:
                payload = json.loads(post_data.decode('utf-8'))
                pid = payload.get("id")
                if delete_project_by_id(pid):
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))
                else:
                    self.send_error(500, "Failed to delete project")
            except Exception as e:
                self.send_error(500, str(e))
        else:
            self.send_error(404, "Not Found")

def start_server():
    class ReusableTCPServer(socketserver.TCPServer):
        allow_reuse_address = True
    try:
        with ReusableTCPServer(("0.0.0.0", PORT), Handler) as httpd:
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 98 or e.errno == 10048:
            log_error(f"Error: Port {PORT} is already in use.")

def launch_browser_app(url):
    """Launches Chrome/Edge in App mode (no address bar) using subprocess."""
    try:
        if platform.system() == "Windows":
            # Try Edge (standard on Windows 10/11)
            subprocess.Popen(f'start msedge --app={url}', shell=True)
            # If start fails, just fallback to default browser
        elif platform.system() == "Darwin":
            subprocess.Popen(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', f'--app={url}'])
        else:
            subprocess.Popen(['google-chrome', f'--app={url}'])
    except Exception as e:
        log_error(f"Browser launch failed: {e}")
        webbrowser.open(url)

class DashboardApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Team T2 Dashboard Server")
        self.root.geometry("350x250")
        self.root.resizable(False, False)

        # Style
        style = ttk.Style()
        style.theme_use('clam') # Usually looks cleaner on Windows

        # UI Elements
        frame = tk.Frame(root, padx=20, pady=20)
        frame.pack(fill=tk.BOTH, expand=True)

        tk.Label(frame, text="Team T2 Dashboard", font=("Segoe UI", 16, "bold")).pack(pady=10)

        status_frame = tk.Frame(frame)
        status_frame.pack(pady=5)
        tk.Label(status_frame, text="Statut:", font=("Segoe UI", 10)).pack(side=tk.LEFT)
        self.status_label = tk.Label(status_frame, text="En cours d'exécution", fg="green", font=("Segoe UI", 10, "bold"))
        self.status_label.pack(side=tk.LEFT, padx=5)

        tk.Label(frame, text=f"Serveur local: http://0.0.0.0:{PORT}", font=("Segoe UI", 9)).pack(pady=5)

        btn_frame = tk.Frame(frame)
        btn_frame.pack(pady=20, fill=tk.X)

        self.btn_open = tk.Button(btn_frame, text="Ouvrir Dashboard", command=self.open_dashboard, bg="#e0e0e0", height=2)
        self.btn_open.pack(fill=tk.X, pady=2)

        self.btn_quit = tk.Button(btn_frame, text="Arrêter et Quitter", command=self.quit_app, bg="#ffcccc", height=2)
        self.btn_quit.pack(fill=tk.X, pady=2)

        # Start server
        self.server_thread = threading.Thread(target=start_server, daemon=True)
        self.server_thread.start()

        # Launch browser initially
        self.root.after(1000, self.open_dashboard)

        # Handle window close button
        self.root.protocol("WM_DELETE_WINDOW", self.quit_app)

        # Hide the main window (run in background)
        self.root.withdraw()

    def start_server_thread(self):
        class ReusableTCPServer(socketserver.TCPServer):
            allow_reuse_address = True
        try:
            with ReusableTCPServer(("0.0.0.0", PORT), Handler) as httpd:
                httpd.serve_forever()
        except OSError as e:
            if e.errno == 98 or e.errno == 10048:
                log_error(f"Error: Port {PORT} is already in use.")

    def open_dashboard(self):
        url = f'http://127.0.0.1:{PORT}'
        try:
            if platform.system() == "Windows":
                 # Use os.startfile for Windows to respect default browser association,
                 # but try to use subprocess for --app mode if possible
                 subprocess.Popen(f'start msedge --app={url}', shell=True)
            elif platform.system() == "Darwin":
                subprocess.Popen(['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', f'--app={url}'])
            else:
                subprocess.Popen(['google-chrome', f'--app={url}'])
        except Exception:
            # Fallback to standard browser
            webbrowser.open(url)

    def quit_app(self):
        if messagebox.askokcancel("Quitter", "Voulez-vous vraiment arrêter le serveur ?"):
            self.root.destroy()
            sys.exit(0)

def main():
    # The frontend must have been built (npm run build) and bundled in the exe
    index_path = os.path.join(RESOURCE_PATH, DIRECTORY, "index.html")
    if not os.path.exists(index_path):
        msg = (f"Interface introuvable : {index_path}\n\n"
               "Lancez 'npm run build' puis recréez l'exécutable avec creer_exe.bat.")
        log_error(msg)
        try:
            root = tk.Tk()
            root.withdraw()
            messagebox.showerror("Dashboard T2", msg)
        except Exception:
            print(msg, file=sys.stderr)
        return

    # If running in an environment without a display, just start the server
    if not os.environ.get('DISPLAY') and sys.platform != 'win32':
        print(f"Starting server without UI on port {PORT}...")
        start_server()
        return

    try:
        root = tk.Tk()
        app = DashboardApp(root)
        root.mainloop()
    except Exception as e:
        print(f"Failed to start UI, falling back to server only: {e}")
        start_server()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log_error(f"Fatal error: {str(e)}\n{traceback.format_exc()}")
        # Show error in a minimal message box if Tkinter initialized
        try:
            messagebox.showerror("Erreur Fatale", f"Une erreur est survenue:\n{e}")
        except:
            print(f"FATAL ERROR: {e}", file=sys.stderr)
