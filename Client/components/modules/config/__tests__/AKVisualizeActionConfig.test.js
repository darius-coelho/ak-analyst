import React from 'react';
import { HashRouter } from 'react-router-dom';

import { createFileOutput } from "../../graph/components/Action.prototype"
import AKVisualizeActionConfig from '../components/AKVisualizeActionConfig';

import { render, cleanup, screen } from "@testing-library/react";

window.setImmediate = window.setTimeout;

describe("Regression action config panel", ()=>{
  afterEach(cleanup);

  it('should test regression config', ()=>{

    const config = {      
      options: {is_sample: true, nsamples: 1000 }
    };

    const file1 = {
      name: "file1.csv",
      path: "./file1.csv",
      columns: ["Y", "X1", "X2", "X3"],
      preview: [{'Y': 1, 'X1': 2, 'X2': 3, 'X3': 4}]      
    };

    const fileOutput1 = createFileOutput(file1);
    const inputs = [{ ...file1, isReady: true, output: fileOutput1}]; 
    render(<HashRouter><AKVisualizeActionConfig config={config} input={inputs} /></HashRouter>);
    
    expect(screen.queryByText("Sample Options")).toBeTruthy();
    expect(screen.queryByText("Launch Visualizer")).toBeTruthy();

    
  });
});
