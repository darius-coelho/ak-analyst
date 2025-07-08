import React from 'react';

import { Note } from '../components/Note';
import { unmountComponentAtNode } from "react-dom";

import { render, screen, fireEvent } from "@testing-library/react";;
import userEvent from '@testing-library/user-event';

describe("Node renderer", () => {
  let container = null;
  beforeEach(() => {
    // setup a DOM element as a render target
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    // cleanup on exiting
    unmountComponentAtNode(container);
    container.remove();
    container = null;
  });

  it("renders Note object", () => {
    const setNoteFocus = jest.fn();
    const setNoteConfig = jest.fn();
    
    const props = {
      id: 0,
      x: 10,
      y: 10,
      width: 180,
      height: 70,
      content: "",
      isEditing: true,
      setNoteFocus: setNoteFocus,
      setNoteConfig: setNoteConfig,
      focus: false
    };

    render(
	<div data-testid='content-container' className="content-container">
	  <div className="basic-container">
            <svg width={500} height={500}><Note {...props} /></svg>
	  </div>
      </div>
    );

    const mainBox = screen.getByTestId('holder');
        
    // Check note position
    expect(+mainBox.getAttribute("x")).toBe(props.x-1);
    expect(+mainBox.getAttribute("y")).toBe(props.y-2);
    expect(+mainBox.getAttribute("width")).toBe(props.width+3);
    expect(+mainBox.getAttribute("height")).toBe(props.height+3);

    // Check note focus action was triggered
    fireEvent.mouseOver(mainBox);    
    fireEvent.mouseDown(mainBox);
    expect(setNoteFocus).toHaveBeenCalledTimes(1);    

    // Check set config was triggered
    const noteTextEdit = screen.getByTestId('noteTextEdit');    
    userEvent.type(noteTextEdit, "test");
    expect(setNoteConfig).toHaveBeenCalledTimes(4); // called 4 times for each alphabet of "test" 
  });
  
});
