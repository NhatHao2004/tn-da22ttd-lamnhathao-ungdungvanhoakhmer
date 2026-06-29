import os
from PIL import Image, ImageChops

def center_and_fix_icon():
    source = 'assets/images/icon.png'
    target_adaptive = 'assets/images/adaptive-icon.png'
    target_icon = 'assets/images/icon.png'
    
    if not os.path.exists(source):
        print("Source icon.png not found")
        return

    # Open image
    img = Image.open(source).convert("RGBA")
    
    # 1. Detect background color (using top-left pixel)
    bg_color = img.getpixel((0, 0))
    
    # 2. Create a mask of the logo using a threshold
    bg = Image.new("RGBA", img.size, bg_color)
    diff = ImageChops.difference(img, bg)
    
    # Convert difference to grayscale and threshold
    gray_diff = diff.convert("L")
    mask = gray_diff.point(lambda x: 255 if x > 15 else 0) # 15 is the tolerance
    
    # Get bounding box of the masked part
    bbox = mask.getbbox()
    
    if not bbox:
        print("Could not detect logo bounding box")
        return

    logo = img.crop(bbox)
    
    # 3. Create a perfect 1024x1024 canvas for both
    # For Adaptive Icon (Foreground should be transparent)
    adaptive_canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    # Standard icon canvas (with background)
    icon_canvas = Image.new("RGBA", (1024, 1024), bg_color)
    
    # Calculate resizing to fit safe area (66% of the size is safe for adaptive icons)
    max_dim = 1024 * 0.65 
    logo_w, logo_h = logo.size
    scale = min(max_dim/logo_w, max_dim/logo_h)
    
    new_w = int(logo_w * scale)
    new_h = int(logo_h * scale)
    logo_resized = logo.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Calculate centering
    offset_x = (1024 - new_w) // 2
    offset_y = (1024 - new_h) // 2
    
    # Paste centered
    adaptive_canvas.paste(logo_resized, (offset_x, offset_y), logo_resized)
    icon_canvas.paste(logo_resized, (offset_x, offset_y), logo_resized)
    
    # Save both
    adaptive_canvas.save(target_adaptive, "PNG")
    icon_canvas.save(target_icon, "PNG")
    
    print(f"Icons centered and saved. BG Color detected: {bg_color}")

if __name__ == "__main__":
    center_and_fix_icon()
