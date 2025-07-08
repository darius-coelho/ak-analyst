import React from 'react';

import { Action } from "../components/Action";
import { LOAD_FILE, CLEANSE, JOIN } from "../../config/components/Config";

import { wait, render, screen, cleanup, fireEvent } from "@testing-library/react";

window.setImmediate = window.setTimeout;

describe("Action renderer", () => {
  afterEach(cleanup);
  
  it("Creates and renders the Action component", () => {
    
    const node = {ID: 0, 'type': CLEANSE, pos: {x: 25, y: 35}, focus: 1};
    const props = {
      ...node,
      nodeSide: 60,
      gridSide: 45,
      setNodeFocus: jest.fn(),
      setNodePos: jest.fn(),
      portMouseDown: jest.fn()
    }
    render(<svg width={500} height={500}><Action {...props} /></svg>);
    
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
    expect(props.setNodeFocus.mock.calls[0][0]).toBe(props.ID);
    
    expect(props.setNodeFocus).toHaveBeenCalledTimes(1);
    expect(props.setNodePos).toHaveBeenCalledTimes(0);    

    fireEvent.mouseMove(mainBox, {delta: {x: 100, y: 0}});

    // check the index is bound to the function
    expect(props.setNodePos.mock.calls[0][0]).toBe(props.ID);
    expect(props.setNodePos).toHaveBeenCalledTimes(1);
    
    fireEvent.mouseUp(mainBox);

    fireEvent.mouseDown(outPort);
    expect(props.portMouseDown).toHaveBeenCalledTimes(1);
    expect(props.portMouseDown.mock.calls[0][0]).toBe(props.ID);
  });
  
});
