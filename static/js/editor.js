/**
 * editor.js - Core PDF Editor functionality
 * 
 * This file implements the PDF Editor's core functionality, including:
 * - PDF file upload and conversion to HTML
 * - Live text editing with format preservation
 * - Text formatting controls
 * - Saving edited content back to PDF
 * 
 * Following NASA's safety-critical coding guidelines, this code uses:
 * - Small, focused functions with clear responsibilities
 * - Comprehensive input validation
 * - Error handling with useful feedback
 * - Clear documentation for maintainability
 */

// Editor state management
const editorState = {
    currentFile: null,
    isEditing: false,
    originalHtml: '',
    hasUnsavedChanges: false,
    selectedRange: null
};

// Editor commands mapping for toolbar buttons
const commandMap = {
    'bold': { execCommand: 'bold', className: 'pdf-bold' },
    'italic': { execCommand: 'italic', className: 'pdf-italic' },
    'underline': { execCommand: 'underline', className: 'pdf-underline' },
    'strikeThrough': { execCommand: 'strikeThrough', className: 'pdf-strikethrough' },
    'subscript': { execCommand: 'subscript', className: 'pdf-subscript' },
    'superscript': { execCommand: 'superscript', className: 'pdf-superscript' },
    'justifyLeft': { execCommand: 'justifyLeft', className: 'pdf-left' },
    'justifyCenter': { execCommand: 'justifyCenter', className: 'pdf-center' },
    'justifyRight': { execCommand: 'justifyRight', className: 'pdf-right' },
    'justifyFull': { execCommand: 'justifyFull', className: 'pdf-justify' },
    'indent': { execCommand: 'indent', className: 'pdf-indent' },
    'outdent': { execCommand: 'outdent' },
    'insertOrderedList': { execCommand: 'insertOrderedList' },
    'insertUnorderedList': { execCommand: 'insertUnorderedList' }
};

// Initialize the editor when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeUploadForm();
    initializeEditorToolbar();
    initializeSaveButton();
    setupBeforeUnloadWarning();
    // Keep track of selection in the editor
    initializeSelectionTracking();
});

/**
 * Initialize the PDF upload form with validation and AJAX submission
 */
function initializeUploadForm() {
    const uploadForm = document.getElementById('upload-form');
    if (!uploadForm) return;
    
    uploadForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const fileInput = document.getElementById('pdf-file');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            showError('Please select a PDF file to upload.');
            return;
        }
        
        const file = fileInput.files[0];
        
        // Validate file type
        if (file.type !== 'application/pdf') {
            showError('The selected file is not a PDF. Please select a PDF file.');
            return;
        }
        
        // Validate file size (max 16MB)
        if (file.size > 16 * 1024 * 1024) {
            showError('The selected file is too large. Maximum file size is 16MB.');
            return;
        }
        
        uploadPdfFile(file);
    });
}

/**
 * Upload the PDF file to the server using AJAX
 * 
 * @param {File} file - The PDF file to upload
 */
function uploadPdfFile(file) {
    const formData = new FormData();
    formData.append('pdf_file', file);
    
    const statusElement = document.getElementById('upload-status');
    if (statusElement) {
        statusElement.innerHTML = '<span class="text-info">Uploading file...</span>';
    }
    
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'flex';
    }
    
    fetch('/upload-pdf', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Server returned ' + response.status + ': ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            if (statusElement) {
                statusElement.innerHTML = '<span class="text-success">File uploaded successfully! Converting to HTML...</span>';
            }
            editorState.currentFile = data.filename;
            
            // Now convert the PDF to HTML
            convertPdfToHtml();
        } else {
            throw new Error(data.error || 'Unknown error during file upload');
        }
    })
    .catch(error => {
        console.error('Error uploading file:', error);
        if (statusElement) {
            statusElement.innerHTML = '<span class="text-danger">Error: ' + error.message + '</span>';
        }
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    });
}

/**
 * Convert the uploaded PDF to HTML format
 */
function convertPdfToHtml() {
    fetch('/convert-pdf', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            filename: editorState.currentFile
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Server returned ' + response.status + ': ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Store the original HTML for comparison
            editorState.originalHtml = data.html_content;
            
            // Display the HTML content
            const pdfContent = document.getElementById('pdf-content');
            if (pdfContent) {
                pdfContent.innerHTML = data.html_content;
                
                // Enable editing mode
                enableEditingMode();
            }
            
            // Hide upload section and show editor section
            const uploadSection = document.getElementById('upload-section');
            const editorSection = document.getElementById('editor-section');
            
            if (uploadSection) {
                uploadSection.style.display = 'none';
            }
            
            if (editorSection) {
                editorSection.style.display = 'block';
            }
            
            const statusElement = document.getElementById('upload-status');
            if (statusElement) {
                statusElement.innerHTML = '';
            }
            
        } else {
            throw new Error(data.error || 'Unknown error during PDF conversion');
        }
    })
    .catch(error => {
        console.error('Error converting PDF:', error);
        const statusElement = document.getElementById('upload-status');
        if (statusElement) {
            statusElement.innerHTML = '<span class="text-danger">Error: ' + error.message + '</span>';
        }
    })
    .finally(() => {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    });
}

/**
 * Enable editing mode for the PDF content
 */
function enableEditingMode() {
    const pdfContent = document.getElementById('pdf-content');
    if (!pdfContent) return;
    
    // Make sure contenteditable is enabled
    pdfContent.setAttribute('contenteditable', 'true');
    
    // Set focus to the editor
    pdfContent.focus();
    
    // Set editing state
    editorState.isEditing = true;
    editorState.hasUnsavedChanges = false;
    
    // Add input event listener to track changes
    pdfContent.addEventListener('input', function() {
        editorState.hasUnsavedChanges = true;
    });
    
    console.log('Editing mode enabled');
}

/**
 * Initialize the editor toolbar buttons and controls
 */
function initializeEditorToolbar() {
    // Get all toolbar buttons with data-command attribute
    const toolbarButtons = document.querySelectorAll('[data-command]');
    
    // Add click event listeners to each button
    toolbarButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const command = this.getAttribute('data-command');
            
            if (command && commandMap[command]) {
                executeCommand(commandMap[command].execCommand);
                
                // Add visual feedback for active state
                if (!this.classList.contains('dropdown-item')) {
                    this.classList.toggle('active');
                }
            }
        });
    });
    
    // Handle font family select
    const fontFamilySelect = document.getElementById('font-family');
    if (fontFamilySelect) {
        fontFamilySelect.addEventListener('change', function() {
            if (this.value) {
                document.execCommand('fontName', false, this.value);
            }
        });
    }
    
    // Handle font size select
    const fontSizeSelect = document.getElementById('font-size');
    if (fontSizeSelect) {
        fontSizeSelect.addEventListener('change', function() {
            if (this.value) {
                document.execCommand('fontSize', false, this.value);
            }
        });
    }
}

/**
 * Execute a document command for text editing
 * 
 * @param {string} command - The document.execCommand command to execute
 */
function executeCommand(command) {
    // Make sure we have a valid command
    if (!command || typeof command !== 'string') {
        console.error('Invalid command:', command);
        return;
    }
    
    // Focus the editor if it's not already focused
    const pdfContent = document.getElementById('pdf-content');
    if (pdfContent && document.activeElement !== pdfContent) {
        pdfContent.focus();
    }
    
    // Restore selection if we have one saved
    if (editorState.selectedRange) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(editorState.selectedRange);
    }
    
    // Execute the command
    try {
        document.execCommand(command, false, null);
    } catch (error) {
        console.error('Error executing command:', command, error);
    }
}

/**
 * Initialize selection tracking in the editor
 */
function initializeSelectionTracking() {
    const pdfContent = document.getElementById('pdf-content');
    if (!pdfContent) return;
    
    pdfContent.addEventListener('mouseup', saveSelection);
    pdfContent.addEventListener('keyup', saveSelection);
    
    // When clicking outside the editor, save the last selection
    document.addEventListener('mousedown', function(e) {
        if (!pdfContent.contains(e.target) && !e.target.closest('.editor-toolbar')) {
            // If clicking outside editor and toolbar, clear selection
            editorState.selectedRange = null;
        }
    });
}

/**
 * Save the current text selection in the editor
 */
function saveSelection() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        editorState.selectedRange = selection.getRangeAt(0);
    }
}

/**
 * Initialize the save button functionality
 */
function initializeSaveButton() {
    const saveButton = document.getElementById('save-pdf-btn');
    if (!saveButton) return;
    
    saveButton.addEventListener('click', function() {
        if (!editorState.isEditing) {
            showError('No PDF is currently being edited.');
            return;
        }
        
        saveEditedPdf();
    });
}

/**
 * Save the edited content back to PDF
 */
function saveEditedPdf() {
    const pdfContent = document.getElementById('pdf-content');
    if (!pdfContent) return;
    
    const htmlContent = pdfContent.innerHTML;
    
    // Show loading indicator
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'flex';
    }
    
    fetch('/save-pdf', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            html_content: htmlContent,
            filename: editorState.currentFile
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Server returned ' + response.status + ': ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Reset the unsaved changes flag
            editorState.hasUnsavedChanges = false;
            
            // Show success message
            showSuccess('PDF saved successfully!');
            
            // Offer download link
            if (data.download_url) {
                window.location.href = data.download_url;
            }
        } else {
            throw new Error(data.error || 'Unknown error during PDF saving');
        }
    })
    .catch(error => {
        console.error('Error saving PDF:', error);
        showError('Error: ' + error.message);
    })
    .finally(() => {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    });
}

/**
 * Setup warning when navigating away with unsaved changes
 */
function setupBeforeUnloadWarning() {
    window.addEventListener('beforeunload', function(e) {
        if (editorState.isEditing && editorState.hasUnsavedChanges) {
            const confirmationMessage = 'You have unsaved changes. Are you sure you want to leave?';
            e.returnValue = confirmationMessage;
            return confirmationMessage;
        }
    });
}

/**
 * Show an error message to the user
 * 
 * @param {string} message - The error message to display
 */
function showError(message) {
    const errorModal = document.getElementById('error-modal');
    const errorMessage = document.getElementById('error-message');
    
    if (errorModal && errorMessage) {
        errorMessage.textContent = message;
        const bsModal = new bootstrap.Modal(errorModal);
        bsModal.show();
    } else {
        alert(message);
    }
}

/**
 * Show a success message
 * 
 * @param {string} message - The success message to display
 */
function showSuccess(message) {
    // You could implement a toast notification here
    alert(message);
}