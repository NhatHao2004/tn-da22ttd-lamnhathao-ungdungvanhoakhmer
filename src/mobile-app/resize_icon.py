import json
import os
import shutil
from PIL import Image

def create_adaptive_icon(input_path, output_path, scale=0.60):
    """
    Resizes the icon to fit within Android's adaptive icon safe zone.
    
    Args:
        input_path (str): Path to the source image.
        output_path (str): Path to save the processed image.
        scale (float): Scale factor (0.60 fits the 66% safe zone comfortably).
    """
    if not os.path.exists(input_path):
        print(f"Error: Input file not found at {input_path}")
        return

    try:
        # Load image and ensure it has an alpha channel
        img = Image.open(input_path).convert("RGBA")
        width, height = img.size
        print(f"Loaded {input_path} ({width}x{height})")

        # Sample background color from edge points to fill margins
        # This ensures the adaptive icon looks seamless
        sample_points = [
            (width // 2, 5),               # top
            (width // 2, height - 5),      # bottom
            (5, height // 2),               # left
            (width - 5, height // 2),      # right
        ]
        
        r_total, g_total, b_total = 0, 0, 0
        count = 0
        for px, py in sample_points:
            pixel = img.getpixel((px, py))
            if pixel[3] > 128:  # Non-transparent pixels
                r_total += pixel[0]
                g_total += pixel[1]
                b_total += pixel[2]
                count += 1
        
        if count > 0:
            bg_color = (r_total // count, g_total // count, b_total // count, 255)
        else:
            bg_color = (59, 156, 163, 255)  # Default fallback color
        
        hex_color = "#{:02X}{:02X}{:02X}".format(bg_color[0], bg_color[1], bg_color[2])
        print(f"Determined background color: {hex_color}")

        # Calculate new dimensions for the centered icon
        new_w = int(width * scale)
        new_h = int(height * scale)
        
        # Resize using high-quality Lanczos resampling
        img_resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

        # Create a new canvas filled with the sampled background color
        canvas = Image.new("RGBA", (width, height), bg_color)

        # Paste the resized icon onto the center of the canvas
        offset_x = (width - new_w) // 2
        offset_y = (height - new_h) // 2
        canvas.paste(img_resized, (offset_x, offset_y), img_resized)

        # Save result
        canvas.save(output_path, "PNG")
        print(f"Saved processed icon to: {output_path}")
        
        # Automatically update app.json to match the new background color
        update_app_config(hex_color)
            
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

def update_app_config(hex_color):
    """Updates app.json with the new adaptive icon background color."""
    app_json_path = "app.json"
    if not os.path.exists(app_json_path):
        print("Warning: app.json not found. Skipping config update.")
        return

    try:
        with open(app_json_path, "r", encoding="utf-8") as f:
            config = json.load(f)
        
        # Traverse the config to find the background color key
        android_config = config.get("expo", {}).get("android", {})
        adaptive_icon = android_config.get("adaptiveIcon", {})
        
        adaptive_icon["backgroundColor"] = hex_color
        
        # Save updated config
        with open(app_json_path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        print(f"Successfully updated app.json with backgroundColor: {hex_color}")
    except Exception as e:
        print(f"Failed to update app.json: {e}")

if __name__ == "__main__":
    ICON_PATH = "assets/images/adaptive-icon.png"
    BACKUP_PATH = "assets/images/adaptive-icon-backup.png"

    # 1. Backup if possible
    if os.path.exists(ICON_PATH):
        shutil.copy2(ICON_PATH, BACKUP_PATH)
        print(f"Created backup at {BACKUP_PATH}")
    
    # 2. Run processing
    create_adaptive_icon(ICON_PATH, ICON_PATH, scale=0.60)

