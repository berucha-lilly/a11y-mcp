/**
 * Example component with accessibility violations for testing
 */

import React from 'react';

interface ButtonProps {
  onClick: () => void;
  children?: React.ReactNode;
}

export const BadButton: React.FC<ButtonProps> = ({ onClick, children }) => {
  // Violations:
  // 1. Using div instead of semantic button element
  // 2. Missing aria-label for potential icon-only usage
  // 3. No focus styles
  
  return (
    <div onClick={onClick} className="button-style">
      {children}
    </div>
  );
};

export const BadImageComponent: React.FC = () => {
  // Violations:
  // 1. Missing alt attribute
  // 2. No accessible name
  
  return (
    <div>
      <img src="image.jpg" />
      <button onClick={() => {}}>X</button>  {/* Icon button without aria-label */}
    </div>
  );
};

export const BadForm: React.FC = () => {
  // Violations:
  // 1. Missing associated label for input
  // 2. No aria-describedby for error messaging
  
  return (
    <form>
      <input type="text" />
      <button onClick={() => {}}>Submit</button>
    </form>
  );
};

export const BadHeadings: React.FC = () => {
  // Violations:
  // 1. Skipping heading level (h1 to h3)
  // 2. Empty heading
  
  return (
    <div>
      <h1>Main Title</h1>
      <h3>Skipped h2</h3>
      <h2></h2>
      <p>Content here</p>
    </div>
  );
};

export const GoodComponent: React.FC = () => {
  // This component demonstrates good accessibility practices
  
  return (
    <div>
      <h1>Accessible Component Example</h1>
      
      {/* Semantic button with proper accessibility */}
      <button 
        onClick={() => {}}
        aria-label="Close dialog"
        className="button"
      >
        Close
      </button>
      
      {/* Image with proper alt text */}
      <img 
        src="hero-image.jpg" 
        alt="Developer working on accessibility compliance"
      />
      
      {/* Form with proper labels */}
      <form>
        <label htmlFor="name-input">Your Name</label>
        <input 
          id="name-input" 
          type="text" 
          aria-describedby="name-help"
        />
        <span id="name-help">Enter your full name</span>
      </form>
      
      {/* Proper heading hierarchy */}
      <section>
        <h2>Section Title</h2>
        <h3>Subsection</h3>
        <p>Content with proper structure</p>
      </section>
    </div>
  );
};