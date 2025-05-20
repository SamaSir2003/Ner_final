import json
from datetime import datetime , timezone
import os
from pathlib import Path  # Better path handling

# Use raw strings (r"") or forward slashes for Windows paths
PICKED_FILE_PATH = os.path.join("tagproject", "picked_files.json")
PICKED_FILE_PATH_MED = os.path.join("tagproject", "picked_files_med.json")
STALE_TIMEOUT_MINUTES = 10

class ReleaseStalePicksMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        self.release_stale_picks()
        return self.get_response(request)

    def _process_file(self, file_path):
        """Helper to process a single JSON file."""
        if not os.path.exists(file_path):
            return

        with open(file_path, "r+") as f:
            data = json.load(f)
            now = datetime.now(timezone.utc)
            updated = {}

            for file, info in data.items():
                if not isinstance(info, dict):
                    continue  # Skip non-dict entries

                if info.get("permanent", True):
                    updated[file] = info
                    continue

                picked_at_str = info.get("picked_at")
                if not picked_at_str:
                    continue  # Skip if no timestamp

                picked_at = datetime.fromisoformat(picked_at_str)
                if (now - picked_at).total_seconds() / 60 <= STALE_TIMEOUT_MINUTES:
                    updated[file] = info
                    print("here",file)
                print("middleare:",now,picked_at,file,(now - picked_at).total_seconds() / 60)

            f.seek(0)
            f.truncate()
            json.dump(updated, f, indent=2)


    def release_stale_picks(self):
        try:
            self._process_file(PICKED_FILE_PATH)
            self._process_file(PICKED_FILE_PATH_MED)
        except json.JSONDecodeError as e:
            print(f"Invalid JSON in file: {e.filename}")  # Log which file failed
        except PermissionError:
            print("Permission denied while accessing files.")
        except Exception as e:
            print(f"Unexpected error: {e}")