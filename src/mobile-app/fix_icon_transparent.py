import os
from PIL import Image

def create_transparent_adaptive_icon(input_path, output_path, scale=0.60):
    if not os.path.exists(input_path):
        print(f"Error: Input file not found at {input_path}")
        return

    try:
        # Load the source image (the blue square logo)
        img = Image.open(input_path).convert("RGBA")
        width, height = img.size
        
        # Calculate new dimensions for the centered icon
        new_w = int(width * scale)
        new_h = int(height * scale)
        
        # Resize the logo
        img_resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

        # Create a new TRANSPARENT canvas
        canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))

        # Paste the resized logo onto the center
        offset_x = (width - new_w) // 2
        offset_y = (height - new_h) // 2
        canvas.paste(img_resized, (offset_x, offset_y), img_resized)

        # Save result
        canvas.save(output_path, "PNG")
        print(f"Saved transparent processed icon to: {output_path}")
            
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    SOURCE_PATH = "assets/images/adaptive-icon-backup.png"
    TARGET_PATH = "assets/images/adaptive-icon.png"
    create_transparent_adaptive_icon(SOURCE_PATH, TARGET_PATH, scale=0.65) # Using 0.65 for a slightly larger fit but still safe
