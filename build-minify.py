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
    in_regex = False
    in_regex_class = False
    
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
            
        if in_regex:
            if char == '\\':
                escape = True
            elif char == '[' and not in_regex_class:
                in_regex_class = True
            elif char == ']' and in_regex_class:
                in_regex_class = False
            elif char == '/' and not in_regex_class:
                in_regex = False
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
            
        # Check for regex literal starting character
        if char == '/':
            # Find the last non-whitespace character in the result
            last_non_ws = ''
            for prev_char in reversed(result):
                if prev_char not in (' ', '\t', '\n', '\r'):
                    last_non_ws = prev_char
                    break
            
            is_regex_start = True
            if last_non_ws.isalnum() or last_non_ws in (')', ']', '}'):
                # Check if the last word is a keyword that can precede a regex
                last_word = ''
                idx = len(result) - 1
                while idx >= 0 and (result[idx].isalnum() or result[idx] == '_'):
                    last_word = result[idx] + last_word
                    idx -= 1
                if last_word in ('return', 'throw', 'yield', 'typeof', 'delete', 'void', 'in', 'instanceof', 'new'):
                    is_regex_start = True
                else:
                    is_regex_start = False
            
            if is_regex_start:
                in_regex = True
                result.append(char)
                i += 1
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
    i18n_src = os.path.join(repo_dir, "public", "i18n.js")
    i18n_dest = os.path.join(repo_dir, "public", "i18n.min.js")
    sw_src = os.path.join(repo_dir, "public", "sw.js")
    sw_dest = os.path.join(repo_dir, "public", "sw.min.js")
    
    print("Minifying CSS...")
    with open(css_src, "r", encoding="utf-8") as f:
        css_data = f.read()
    minified_css = minify_css(css_data)
    with open(css_dest, "w", encoding="utf-8") as f:
        f.write(minified_css)
    print(f"CSS Minified: {len(css_data)} -> {len(minified_css)} bytes")
    
    print("Minifying app.js...")
    with open(js_src, "r", encoding="utf-8") as f:
        js_data = f.read()
    minified_js = minify_js(js_data)
    # Rewrite service worker registration to sw.min.js in production
    minified_js = minified_js.replace("'/sw.js'", "'/sw.min.js'").replace('"/sw.js"', '"/sw.min.js"')
    with open(js_dest, "w", encoding="utf-8") as f:
        f.write(minified_js)
    print(f"JS Minified (app.js): {len(js_data)} -> {len(minified_js)} bytes")
    
    print("Minifying i18n.js...")
    with open(i18n_src, "r", encoding="utf-8") as f:
        i18n_data = f.read()
    minified_i18n = minify_js(i18n_data)
    with open(i18n_dest, "w", encoding="utf-8") as f:
        f.write(minified_i18n)
    print(f"JS Minified (i18n.js): {len(i18n_data)} -> {len(minified_i18n)} bytes")
    
    print("Minifying sw.js...")
    with open(sw_src, "r", encoding="utf-8") as f:
        sw_data = f.read()
    minified_sw = minify_js(sw_data)
    with open(sw_dest, "w", encoding="utf-8") as f:
        f.write(minified_sw)
    print(f"JS Minified (sw.js): {len(sw_data)} -> {len(minified_sw)} bytes")
    
    # Sync to preview directory
    print("Syncing to preview directory...")
    os.makedirs(os.path.join(preview_dir, "public"), exist_ok=True)
    with open(os.path.join(preview_dir, "public", "styles.min.css"), "w", encoding="utf-8") as f:
        f.write(minified_css)
    with open(os.path.join(preview_dir, "public", "app.min.js"), "w", encoding="utf-8") as f:
        f.write(minified_js)
    with open(os.path.join(preview_dir, "public", "i18n.min.js"), "w", encoding="utf-8") as f:
        f.write(minified_i18n)
    with open(os.path.join(preview_dir, "public", "sw.min.js"), "w", encoding="utf-8") as f:
        f.write(minified_sw)
        
    with open(os.path.join(preview_dir, "styles.min.css"), "w", encoding="utf-8") as f:
        f.write(minified_css)
        
    print("Minification and sync complete!")

if __name__ == "__main__":
    main()
