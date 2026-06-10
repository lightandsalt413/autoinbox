#!/usr/bin/env python3
import os
import re

def minify_css(css_content):
    # Remove comments
    css = re.sub(r'/\*.*?\*/', '', css_content, flags=re.DOTALL)
    # Replace multiple whitespace with single space
    css = re.sub(r'\s+', ' ', css)
    # Remove space around punctuation
    css = re.sub(r'\s*([\{\}:;,])\s*', r'\1', css)
    # Remove trailing semicolon before }
    css = re.sub(r';}', '}', css)
    return css.strip()

def minify_js(js_content):
    result = []
    in_string = None  # '"', "'", "`"
    escape = False
    in_line_comment = False
    in_block_comment = False
    
    i = 0
    n = len(js_content)
    while i < n:
        char = js_content[i]
        next_char = js_content[i+1] if i + 1 < n else ''
        
        if in_line_comment:
            if char in ('\n', '\r'):
                in_line_comment = False
                result.append(char)
            i += 1
            continue
            
        if in_block_comment:
            if char == '*' and next_char == '/':
                in_block_comment = False
                i += 2
            else:
                i += 1
            continue
            
        if escape:
            result.append(char)
            escape = False
            i += 1
            continue
            
        if in_string:
            if char == '\\':
                escape = True
            elif char == in_string:
                in_string = None
            result.append(char)
            i += 1
            continue
            
        if char in ('"', "'", '`'):
            in_string = char
            result.append(char)
            i += 1
            continue
            
        # Check for comments
        if char == '/' and next_char == '/':
            in_line_comment = True
            i += 2
            continue
            
        if char == '/' and next_char == '*':
            in_block_comment = True
            i += 2
            continue
            
        result.append(char)
        i += 1
        
    temp = "".join(result)
    # Collapse multiple blank lines
    temp = re.sub(r'\n{3,}', '\n\n', temp)
    return temp.strip()

def main():
    repo_dir = "/Users/renejayflores/.gemini/antigravity/scratch/autoinbox-git"
    preview_dir = "/Users/renejayflores/.gemini/antigravity/scratch/autoinbox"
    
    css_src = os.path.join(repo_dir, "public", "styles.css")
    css_dest = os.path.join(repo_dir, "public", "styles.min.css")
    js_src = os.path.join(repo_dir, "public", "app.js")
    js_dest = os.path.join(repo_dir, "public", "app.min.js")
    
    print("Minifying CSS...")
    with open(css_src, "r", encoding="utf-8") as f:
        css_data = f.read()
    minified_css = minify_css(css_data)
    with open(css_dest, "w", encoding="utf-8") as f:
        f.write(minified_css)
    print(f"CSS Minified: {len(css_data)} -> {len(minified_css)} bytes")
    
    print("Minifying JS...")
    with open(js_src, "r", encoding="utf-8") as f:
        js_data = f.read()
    minified_js = minify_js(js_data)
    with open(js_dest, "w", encoding="utf-8") as f:
        f.write(minified_js)
    print(f"JS Minified: {len(js_data)} -> {len(minified_js)} bytes")
    
    # Sync to preview directory
    print("Syncing to preview directory...")
    os.makedirs(os.path.join(preview_dir, "public"), exist_ok=True)
    with open(os.path.join(preview_dir, "public", "styles.min.css"), "w", encoding="utf-8") as f:
        f.write(minified_css)
    with open(os.path.join(preview_dir, "public", "app.min.js"), "w", encoding="utf-8") as f:
        f.write(minified_js)
        
    with open(os.path.join(preview_dir, "styles.min.css"), "w", encoding="utf-8") as f:
        f.write(minified_css)
        
    print("Minification and sync complete!")

if __name__ == "__main__":
    main()
