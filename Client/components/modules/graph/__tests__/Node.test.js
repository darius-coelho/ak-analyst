import React from 'react';

import { Node } from '../components/Node';
import { unmountComponentAtNode } from "react-dom";

import { render, screen, fireEvent } from "@testing-library/react";;

import { uploadData, transformData } from '../components/icons/akIcons';

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

  it("renders Node object", () => {
    const setNodeFocus = jest.fn();
    const updateNodePos = jest.fn();
    const portMouseDown = jest.fn();
    const dragEnd = jest.fn();
    
    const props = {
      nodeSide: 60,
      gridSide: 45,
      portWidth: 10,
      portHeight: 10,
      pos:{x: 25, y: 35},
      icon: transformData,
      ID: 0,
      focus: 0,
      onStart: setNodeFocus,
      onDrag: updateNodePos,
      onStop: dragEnd,
      portMouseDown: portMouseDown
    };

    render(<svg width={500} height={500}><Node {...props} /></svg>);

    const mainBox = screen.getByTestId('holder');
    const inPort = screen.getByTestId('in-port');
    const outPort = screen.getByTestId('out-port');
    const akIcon = screen.getByTestId('akIcon');
        
    expect(+mainBox.getAttribute("x")).toBe(props.pos.x);
    expect(+mainBox.getAttribute("y")).toBe(props.pos.y);
    expect(+mainBox.getAttribute("width")).toBe(2*props.gridSide);
    expect(+mainBox.getAttribute("height")).toBe(2*props.gridSide);
    
    expect(inPort.getAttribute("transform")).toBe(`translate(${props.pos.x} ${props.pos.y+props.gridSide}) rotate(90)`);

    expect(outPort.getAttribute("transform")).toBe(`translate(${props.pos.x+2*props.gridSide} ${props.pos.y+props.gridSide}) rotate(90)`);

    expect(+akIcon.getAttribute("x")).toBe(props.pos.x + props.gridSide - props.nodeSide/2);
    expect(+akIcon.getAttribute("y")).toBe(props.pos.y + props.gridSide - props.nodeSide/2);
    expect(+akIcon.getAttribute("width")).toBe(props.nodeSide);
    expect(+akIcon.getAttribute("height")).toBe(props.nodeSide);

    // check events
    fireEvent.mouseOver(mainBox);
    fireEvent.mouseMove(mainBox);
    fireEvent.mouseDown(mainBox);

    // check the index is bound to the function
    expect(setNodeFocus.mock.calls[0][0]).toBe(props.ID);
    
    expect(setNodeFocus).toHaveBeenCalledTimes(1);
    expect(updateNodePos).toHaveBeenCalledTimes(0);    

    fireEvent.mouseMove(mainBox, {delta: {x: 100, y: 0}});

    // check the index is bound to the function
    expect(updateNodePos.mock.calls[0][0]).toBe(props.ID);
    expect(updateNodePos).toHaveBeenCalledTimes(1);

    fireEvent.mouseUp(mainBox);

    // NOTE: I suspect that it gets called twice due to some
    // internal way that react-draggable is handling mouseUp events.
    // This should not necessarily be a problem though.
    //expect(updateDims).toHaveBeenCalledTimes(2);

    fireEvent.mouseDown(outPort);
    expect(portMouseDown).toHaveBeenCalledTimes(1);
    expect(portMouseDown.mock.calls[0][0]).toBe(props.ID);
  });

  it("renders LOAD_FILE Node object", () => {
    const setNodeFocus = jest.fn();
    const updateNodePos = jest.fn();
    const portMouseDown = jest.fn();
    const dragEnd = jest.fn();
    
    const props = {
      nodeSide: 60,
      gridSide: 45,
      portWidth: 10,
      portHeight: 10,
      pos:{x: 25, y: 35},
      icon: uploadData,
      config: { name: "filename.csv"},
      type: "LOAD_FILE",
      ID: 0,
      focus: 0,
      onStart: setNodeFocus,
      onDrag: updateNodePos,
      onStop: dragEnd,
      portMouseDown: portMouseDown
    };

    render(<svg width={500} height={500}><Node {...props} /></svg>);

    const mainBox = screen.getByTestId('holder');    
    const outPort = screen.getByTestId('out-port');
    const akIcon = screen.getByTestId('akIcon');
        
    expect(+mainBox.getAttribute("x")).toBe(props.pos.x);
    expect(+mainBox.getAttribute("y")).toBe(props.pos.y);
    expect(+mainBox.getAttribute("width")).toBe(2*props.gridSide);
    expect(+mainBox.getAttribute("height")).toBe(2*props.gridSide);

    expect(outPort.getAttribute("transform")).toBe(`translate(${props.pos.x+2*props.gridSide} ${props.pos.y+props.gridSide}) rotate(90)`);

    expect(+akIcon.getAttribute("x")).toBe(props.pos.x + props.gridSide - props.nodeSide/2);
    expect(+akIcon.getAttribute("y")).toBe(props.pos.y + props.gridSide - props.nodeSide/2);
    expect(+akIcon.getAttribute("width")).toBe(props.nodeSide);
    expect(+akIcon.getAttribute("height")).toBe(props.nodeSide);
    
    // Check that filename is displayed and is cut off
    expect(screen.getByText("filenam...")).toBeTruthy()
    
  });

  it("renders Loading Node object", () => {
    const setNodeFocus = jest.fn();
    const updateNodePos = jest.fn();
    const portMouseDown = jest.fn();
    const dragEnd = jest.fn();
    
    const props = {
      nodeSide: 60,
      gridSide: 45,
      portWidth: 10,
      portHeight: 10,
      pos:{x: 25, y: 35},
      icon: transformData,      
      focus: 0,
      ID: 0,
      isLoading: true,
      onStart: setNodeFocus,
      onDrag: updateNodePos,
      onStop: dragEnd,
      portMouseDown: portMouseDown
    };

    render(<svg width={500} height={500}><Node {...props} /></svg>);

    const mainBox = screen.getByTestId('holder');
    const inPort = screen.getByTestId('in-port');
    const outPort = screen.getByTestId('out-port');
    const akIcon = screen.getByTestId('akIcon');
    const spinner = screen.getByTestId('icon-spinner');

    expect(+mainBox.getAttribute("x")).toBe(props.pos.x);
    expect(+mainBox.getAttribute("y")).toBe(props.pos.y);
    expect(+mainBox.getAttribute("width")).toBe(2*props.gridSide);
    expect(+mainBox.getAttribute("height")).toBe(2*props.gridSide);

    expect(spinner.getAttribute("transform")).toBe(`translate(${props.pos.x+props.gridSide},${props.pos.y+props.gridSide})`);

    expect(inPort.getAttribute("transform")).toBe(`translate(${props.pos.x} ${props.pos.y+props.gridSide}) rotate(90)`);

    expect(outPort.getAttribute("transform")).toBe(`translate(${props.pos.x+2*props.gridSide} ${props.pos.y+props.gridSide}) rotate(90)`);

    expect(+akIcon.getAttribute("x")).toBe(props.pos.x + props.gridSide - props.nodeSide/2);
    expect(+akIcon.getAttribute("y")).toBe(props.pos.y + props.gridSide - props.nodeSide/2);
    expect(+akIcon.getAttribute("width")).toBe(props.nodeSide);
    expect(+akIcon.getAttribute("height")).toBe(props.nodeSide);

    // check events
    fireEvent.mouseOver(mainBox);
    fireEvent.mouseMove(mainBox);
    fireEvent.mouseDown(mainBox);

    // check the index is bound to the function
    expect(setNodeFocus.mock.calls[0][0]).toBe(props.ID);
    
    expect(setNodeFocus).toHaveBeenCalledTimes(1);
    expect(updateNodePos).toHaveBeenCalledTimes(0);

    fireEvent.mouseMove(mainBox, {delta: {x: 100, y: 0}});

    // check the index is bound to the function
    expect(updateNodePos.mock.calls[0][0]).toBe(props.ID);
    expect(updateNodePos).toHaveBeenCalledTimes(1);

    fireEvent.mouseUp(mainBox);

    // NOTE: I suspect that it gets called twice due to some
    // internal way that react-draggable is handling mouseUp events.
    // This should not necessarily be a problem though.
    //expect(updateDims).toHaveBeenCalledTimes(2);

    fireEvent.mouseDown(outPort);
    expect(portMouseDown).toHaveBeenCalledTimes(1);
    expect(portMouseDown.mock.calls[0][0]).toBe(props.ID);
  });
  
});
