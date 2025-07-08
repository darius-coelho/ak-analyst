import React from 'react';
import { ActionOutput } from "../components/ActionOutput"

import {render, screen, fireEvent } from "@testing-library/react";

window.setImmediate = window.setTimeout;

describe("config panel", () => {
  it('should test the initial state', ()=>{
    const pathTo = jest.fn();
    render(<ActionOutput pathTo={pathTo} />);
    expect(screen.getByTestId("container").textContent).toBe("");
    
  });  

  it('should test the load action config when there are output params.', ()=>{
    const preview = [
      {'c1': 1, 'c2': 2, 'c3': 3},
      {'c1': 2, 'c2': 3, 'c3': 4},
      {'c1': 3, 'c2': 4, 'c3': 5},
    ]

    const pathTo = jest.fn();
    const setOutput = jest.fn();
    
    const node = {'type': 'LOAD_FILE', output: [{
      preview: preview,
      dims: [10,10],
      path: 'test/test.txt',
      lastModified: 'now',
      size: 100,
    }]};
    render(<ActionOutput focusNode={node} pathTo={pathTo} setOutput={setOutput}/>);

    // table should be there
    expect(screen.queryByText("Data Preview")).toBeTruthy();        
    expect(screen.queryByText("File Info")).toBeTruthy();        

    expect(screen.queryByText("c1")).toBeTruthy();        
    expect(screen.queryByText("c2")).toBeTruthy();        
    expect(screen.queryByText("c3")).toBeTruthy();
  });  
  

});
