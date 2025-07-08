import React from 'react';

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";

import SKLearnActionOutput from '../components/SKLearnActionOutput';

describe("SKLearn action ouput panel", () => {
  it('should test initial state (no connections)', () => {    
    render(<SKLearnActionOutput/>);
    expect(screen.queryByText("Model Fit Results")).toBeNull();       
  });

  
  it('should test with sklearn output', () => {
    const output = [{
      itemCount: 100,
      featureCount: 10,
      error: {
      'R^2': 1.0,
      'MSE': 1.0,
      'RMSE': 1.0,
      }
    }]
    
    render(<SKLearnActionOutput output={output}/>);
    expect(screen.queryByText("Model Fit Results")).toBeTruthy();

    expect(screen.queryByText(`Item Count`)).toBeTruthy();
    expect(screen.queryByText(`${output[0].itemCount}`)).toBeTruthy();
    
    expect(screen.queryByText(`Feature Count`)).toBeTruthy();
    expect(screen.queryByText(`${output[0].featureCount-1}`)).toBeTruthy();

    expect(screen.queryByText(`R^2`)).toBeTruthy();
    expect(screen.queryByText(`MSE`)).toBeTruthy();
    expect(screen.queryByText(`RMSE`)).toBeTruthy();
  });
});
