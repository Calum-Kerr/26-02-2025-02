from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import os
from werkzeug.utils import secure_filename
import logging
import traceback

# Initialize Flask application
app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev_key_for_testing")  # Add secret key for session management
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Limit uploads to 16MB
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Allowable file extensions
ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    """
    Validate if the uploaded file has an allowed extension
    
    Args:
        filename (str): Name of the uploaded file
        
    Returns:
        bool: True if file extension is allowed, False otherwise
    """
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Main routes for the application
@app.route('/')
def home():
    """Render the home page"""
    return render_template('home.html')

@app.route('/editor')
def editor():
    """Render the PDF editor page"""
    return render_template('editor.html')

@app.route('/privacy')
def privacy():
    """Render the privacy policy page"""
    return render_template('privacy.html')

@app.route('/terms')
def terms():
    """Render the terms of use page"""
    return render_template('terms.html')

@app.route('/about')
def about():
    """Render the about page"""
    return render_template('about.html')

@app.route('/contact')
def contact():
    """Render the contact page"""
    return render_template('contact.html')

@app.route('/upload-pdf', methods=['POST'])
def upload_pdf():
    """
    Handle PDF upload and conversion to HTML
    
    Returns:
        JSON response with status and file information
    """
    try:
        # Validate that the POST request has a file part
        if 'pdf_file' not in request.files:
            logger.error("No file part in the request")
            return jsonify({'error': 'No file part'}), 400
        
        file = request.files['pdf_file']
        
        # Validate that a file was selected
        if file.filename == '':
            logger.error("No file selected")
            return jsonify({'error': 'No file selected'}), 400
        
        # Validate file type
        if not allowed_file(file.filename):
            logger.error(f"File type not allowed: {file.filename}")
            return jsonify({'error': 'Only PDF files are allowed'}), 400
        
        # Secure the filename and save the file
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Store file information in session
        session['pdf_file'] = {
            'filename': filename,
            'path': file_path
        }
        
        # Here we would call the PDF-to-HTML conversion function
        # For now, we'll just respond that the upload was successful
        
        logger.info(f"File successfully uploaded: {filename}")
        return jsonify({
            'success': True,
            'message': 'PDF uploaded successfully',
            'filename': filename,
            'redirect_url': url_for('editor')
        }), 200
        
    except Exception as e:
        logger.error(f"Error during file upload: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'An unexpected error occurred during upload'}), 500

@app.route('/convert-pdf', methods=['POST'])
def convert_pdf():
    """
    Convert uploaded PDF to HTML
    
    Returns:
        JSON response with HTML content
    """
    try:
        if 'pdf_file' not in session:
            return jsonify({'error': 'No PDF file uploaded'}), 400
        
        file_info = session['pdf_file']
        
        # Here we would call the actual PDF-to-HTML conversion function
        # This is a placeholder for the backend integration
        
        # Simulate HTML content for demonstration purposes
        html_content = "<div class='pdf-page'>This is where the converted PDF content would appear.</div>"
        
        return jsonify({
            'success': True,
            'html_content': html_content
        }), 200
        
    except Exception as e:
        logger.error(f"Error during PDF conversion: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'An unexpected error occurred during conversion'}), 500

@app.route('/save-pdf', methods=['POST'])
def save_pdf():
    """
    Save edited HTML content back to PDF
    
    Returns:
        JSON response with status and file information
    """
    try:
        # Validate request has the HTML content
        if not request.json or 'html_content' not in request.json:
            return jsonify({'error': 'No HTML content provided'}), 400
        
        html_content = request.json['html_content']
        
        # Here we would call the function to convert HTML back to PDF
        # This is a placeholder for the backend integration
        
        return jsonify({
            'success': True,
            'message': 'PDF saved successfully',
            'download_url': url_for('download_pdf')
        }), 200
        
    except Exception as e:
        logger.error(f"Error during PDF saving: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'An unexpected error occurred while saving'}), 500

@app.route('/download-pdf')
def download_pdf():
    """
    Download the regenerated PDF file
    
    Returns:
        File download response
    """
    # This would serve the regenerated PDF file
    return jsonify({'message': 'This endpoint would serve the regenerated PDF'}), 200

@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle file size too large errors"""
    return jsonify({'error': 'File too large (max 16MB)'}), 413

if __name__ == '__main__':
    app.run(debug=True)