/**
 * main.js - Common JavaScript functionality for PDF Editor application
 * 
 * This file contains functions that are used across multiple pages of the application.
 * It follows NASA's safety-critical coding guidelines with small, focused functions,
 * rigorous error handling, and clear documentation.
 */

// Execute when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap tooltips
    initializeTooltips();
    
    // Initialize date display in footer
    updateCopyrightYear();
    
    // Setup AJAX error handling
    setupGlobalAjaxErrorHandling();
});

/**
 * Initialize Bootstrap tooltips for improved UI experience
 */
function initializeTooltips() {
    try {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    } catch (error) {
        console.error('Error initializing tooltips:', error);
    }
}

/**
 * Update the copyright year in the footer dynamically
 */
function updateCopyrightYear() {
    try {
        const copyrightElements = document.querySelectorAll('.footer p');
        const currentYear = new Date().getFullYear();
        
        copyrightElements.forEach(element => {
            if (element.textContent.includes('©')) {
                element.textContent = element.textContent.replace(/\d{4}/, currentYear);
            }
        });
    } catch (error) {
        console.error('Error updating copyright year:', error);
    }
}

/**
 * Setup global AJAX error handling
 */
function setupGlobalAjaxErrorHandling() {
    // Add global AJAX error handler for fetch operations
    window.addEventListener('unhandledrejection', function(event) {
        if (event.reason instanceof Error) {
            handleAjaxError(event.reason);
        }
    });
}

/**
 * Handle AJAX errors with appropriate user feedback
 * 
 * @param {Error} error - The error object from the failed request
 */
function handleAjaxError(error) {
    console.error('AJAX request failed:', error);
    
    // Check if there's an error modal in the DOM
    const errorModal = document.getElementById('error-modal');
    const errorMessage = document.getElementById('error-message');
    
    if (errorModal && errorMessage) {
        // Update error message and show modal
        errorMessage.textContent = 'An error occurred: ' + (error.message || 'Unknown error');
        const bsModal = new bootstrap.Modal(errorModal);
        bsModal.show();
    } else {
        // Fallback to alert if modal isn't available
        alert('An error occurred: ' + (error.message || 'Unknown error'));
    }
}

/**
 * Send an AJAX request with error handling and validation
 * 
 * @param {string} url - The URL for the request
 * @param {Object} options - Fetch API options
 * @param {function} onSuccess - Callback function for successful response
 * @returns {Promise} - Promise representing the fetch operation
 */
function sendRequest(url, options, onSuccess) {
    // Input validation
    if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL provided for AJAX request');
    }
    
    if (!options || typeof options !== 'object') {
        options = {}; // Default to empty options object
    }
    
    // Show loading indicator if present in the DOM
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'flex';
    }
    
    return fetch(url, options)
        .then(response => {
            // Check if response is OK (status in the range 200-299)
            if (!response.ok) {
                throw new Error('Server returned ' + response.status + ': ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            if (typeof onSuccess === 'function') {
                onSuccess(data);
            }
            return data;
        })
        .catch(error => {
            handleAjaxError(error);
            throw error; // Re-throw for additional handling if needed
        })
        .finally(() => {
            // Hide loading indicator when done
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
        });
}

/**
 * Format a file size in bytes to a human-readable string
 * 
 * @param {number} bytes - File size in bytes
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} - Formatted file size string
 */
function formatFileSize(bytes, decimals = 2) {
    if (!bytes || bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}