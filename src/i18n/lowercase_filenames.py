import os
import shutil

def copy_with_lowercase_filenames(source_dir, target_dir):
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)

    for filename in os.listdir(source_dir):
        source_path = os.path.join(source_dir, filename)

        # Only process files (skip subdirectories)
        if os.path.isfile(source_path):
            lowercase_name = filename.lower()
            target_path = os.path.join(target_dir, lowercase_name)

            # Copy the file with the new lowercase name
            shutil.copy2(source_path, target_path)
            print(f"Copied {filename} -> {lowercase_name}")

if __name__ == "__main__":
    base_dir = os.path.dirname(__file__)
    source_dir = os.path.join(base_dir, "languages")
    target_dir = os.path.join(base_dir, "new")

    if os.path.exists(source_dir):
        copy_with_lowercase_filenames(source_dir, target_dir)
        print(f"\nAll files copied to {target_dir} with lowercase names.")
    else:
        print(f"'languages' directory not found at: {source_dir}")
