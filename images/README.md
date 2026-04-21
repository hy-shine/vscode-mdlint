# Extension Assets

## Icon

Before publishing to the VS Code Marketplace, convert `icon.svg` to `icon.png` (128x128 pixels):

```bash
# Using cairosvg (Python)
pip install cairosvg
cairosvg images/icon.svg -o images/icon.png --output-width 128 --output-height 128

# Or using ImageMagick
convert images/icon.svg -resize 128x128 images/icon.png

# Or using Inkscape
inkscape images/icon.svg --export-filename=images/icon.png --export-width=128 --export-height=128
```

The `icon.png` file is referenced in `package.json` under the `"icon"` field.
