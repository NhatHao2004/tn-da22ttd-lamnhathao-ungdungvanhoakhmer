import os
from PIL import Image

def process_icon():
    source = 'assets/images/icon.png'
    target = 'assets/images/adaptive-icon.png'
    
    if not os.path.exists(source):
        print("Source not found")
        return

    img = Image.open(source).convert("RGBA")
    w, h = img.size
    
    # Scaling factor for the centered icon (to avoid edge clipping on some Android launchers)
    scale = 0.65
    new_w = int(w * scale)
    new_h = int(h * scale)
    
    img_resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Create transparent canvas
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    offset_x = (w - new_w) // 2
    offset_y = (h - new_h) // 2
    
    # If the source image has a dark background, we can't easily extract just the logo
    # without complex masking. However, since we are setting the background color in app.json,
    # we can just center the whole image if the background matches.
    # But often adaptive icons work better when they are truly transparent.
    # Let's try to assume the center of the image is the logo and we want to keep it.
    
    canvas.paste(img_resized, (offset_x, offset_y), img_resized)
    canvas.save(target, "PNG")
    print("Success")

if __name__ == "__main__":
    process_icon()
