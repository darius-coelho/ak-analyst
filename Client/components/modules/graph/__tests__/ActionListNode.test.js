import React from 'react';

import { ActionListNode } from '../components/ActionListNode';
import { CLEANSE } from '../../config/components/Config';

import { wait, render, screen, cleanup, fireEvent } from "@testing-library/react";
import { jssPreset } from '@material-ui/core';

window.setImmediate = window.setTimeout;

describe("Action List icon for drag and drop", () => {
  afterEach(cleanup);
  
  it("Draws a node in the right position", ()=>{
    render(      
      <ActionListNode 
        type={CLEANSE}
        setDragEdge={jest.fn()}
        nodeSide={50} 
        gridSide={45}/>      
    );

    expect(screen.queryAllByTestId('action-list-node')).toBeTruthy();
    const alNode = screen.queryAllByTestId('action-list-node');    
    expect(alNode[0].style.width).toBe("50px");    
  });
});
