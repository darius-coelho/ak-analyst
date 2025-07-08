import React from 'react';
import { HashRouter } from 'react-router-dom';

import { createFileOutput } from "../../graph/components/Action.prototype"
import AKRegressionActionConfig from "../components/AKRegressionActionConfig"

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";

window.setImmediate = window.setTimeout;

describe("Regression action config panel", ()=>{
  afterEach(cleanup);

  it('should test regression config', ()=>{

    const config = {      
      options: {is_sample: true, nsamples: 1000 },
      target: "Y",
      predictors: ["X1", "X2", "X3"],
      windowSize: 30,
      confidInterval: 90,
      featureSel: false
    };

    const file1 = {
      name: "file1.csv",
      path: "./file1.csv",
      columns: ["Y", "X1", "X2", "X3"],
      preview: [{'Y': 1, 'X1': 2, 'X2': 3, 'X3': 4}]      
    };

    const fileOutput1 = createFileOutput(file1);
    
    const inputs = [
      {
        0: fileOutput1,
        outPort: 0,
        isReady: true
      }
    ]
    render(<HashRouter><AKRegressionActionConfig config={config} input={inputs} /></HashRouter>);
    
    expect(screen.queryByText("Sample Options")).toBeTruthy();
    expect(screen.queryByText("Target")).toBeTruthy();
    expect(screen.queryByText("Predictors")).toBeTruthy();
    expect(screen.queryByText("Window")).toBeTruthy();
    expect(screen.queryByText("Confidence Interval")).toBeTruthy();
    expect(screen.queryByText("Feature Selection")).toBeTruthy();

    // Test all values in config are rendered
    expect(screen.queryByText(config.target)).toBeTruthy();    
    config.predictors.forEach((a)=> {           
      expect(screen.queryAllByText(a)).toBeTruthy();
    }); 
    expect(+screen.getByTestId("window").getAttribute('value')).toEqual(config.windowSize);
    expect(+screen.getByTestId("confidence").getAttribute('value')).toEqual(config.confidInterval);
  });
});
