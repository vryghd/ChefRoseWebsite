import fitz  # PyMuPDF
import sys
import os

def normalize_pdf(input_path, output_path):
    print(f"Opening {input_path}...")
    src_doc = fitz.open(input_path)
    
    if len(src_doc) == 0:
        print("Empty PDF")
        return
        
    # Assume the first page has the correct/target dimensions
    target_rect = src_doc[0].rect
    target_width = target_rect.width
    target_height = target_rect.height
    print(f"Target dimensions: {target_width} x {target_height}")
    
    dest_doc = fitz.open()
    
    for page_num in range(len(src_doc)):
        src_page = src_doc[page_num]
        src_rect = src_page.rect
        
        # Create a new blank page in destination with target dimensions
        dest_page = dest_doc.new_page(width=target_width, height=target_height)
        
        # Calculate scaling to fit the source page into target page without stretching
        # We want to fit it exactly, but maybe it just needs to be placed centered if it's smaller,
        # or scaled down if it's bigger. The user said "some of them appear smaller than the others",
        # so we should scale them UP to fit the target width/height, maintaining aspect ratio.
        
        scale_w = target_width / src_rect.width
        scale_h = target_height / src_rect.height
        scale = min(scale_w, scale_h)
        
        new_width = src_rect.width * scale
        new_height = src_rect.height * scale
        
        # Calculate centering offsets
        x_offset = (target_width - new_width) / 2
        y_offset = (target_height - new_height) / 2
        
        # The rectangle where the original page will be drawn on the new page
        draw_rect = fitz.Rect(x_offset, y_offset, x_offset + new_width, y_offset + new_height)
        
        # Draw the source page onto the new destination page
        dest_page.show_pdf_page(draw_rect, src_doc, page_num)
        
        print(f"Processed page {page_num + 1}/{len(src_doc)}")
        
    # Save the new document
    print(f"Saving to {output_path}...")
    dest_doc.save(output_path, garbage=3, deflate=True)
    dest_doc.close()
    src_doc.close()
    print("Done!")

if __name__ == "__main__":
    input_file = "/Users/rosebook/Desktop/Chef Rose Website/Rose Cookbook v1.pdf"
    output_file = "/Users/rosebook/Desktop/Chef Rose Website/public/assets/downloads/cookbook-v1.pdf"
    normalize_pdf(input_file, output_file)
