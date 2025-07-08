import React from 'react';

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";
import userEvent from '@testing-library/user-event';

import AKMineActionConfig from '../components/AKMineActionConfig';

describe("AK mine action config panel", () => {
 
  it('should test with input and config (fpminer)', () => {
    const setParams = jest.fn();

    const input = [
      {
        0: {
          isAvailable: true,
          type: "action.type/FILE",
          columns: ['Col1', 'Col2', 'Col3', 'Col4', 'Col5'],
          colTypes: {
            Col1: 'Numerical', Col2: 'Numerical',
            Col3: 'Numerical', Col4: 'Numerical',
            Col5: 'Nominal'
          }
        },
        outPort: 0,
        isReady: true
      }
    ]

    const config = {
      options: {is_sample: true, nsamples: 1000},
      target: ["Col1"],      
      mineType: "numeric",
      method: "fpminer",
      threshold: 0.6,
      maxPattern: 100,
      holdout: 1,
      minsup: 0.01
    }
    render(<AKMineActionConfig setParams={setParams} input={input} config={config}/>);
    expect(screen.queryByText("Sample Options")).toBeTruthy();
    expect(screen.queryByText("Target")).toBeTruthy();
    expect(screen.queryByText("Mine Type")).toBeTruthy();
    expect(screen.queryByText("Max Pattern")).toBeTruthy();
    expect(screen.queryByText("Threshold")).toBeTruthy();
    expect(screen.queryByText("Holdout")).toBeTruthy();
    expect(screen.queryByText("Min. Pattern Size")).toBeTruthy();

    // Test all values in config are rendered
    expect(screen.queryByText(config.target[0])).toBeTruthy();
    expect(screen.queryByText("Numeric")).toBeTruthy();
    expect(screen.queryByDisplayValue(config.threshold)).toBeTruthy();
    expect(screen.queryByDisplayValue(config.maxPattern)).toBeTruthy();
    expect(screen.queryByDisplayValue(config.holdout)).toBeTruthy();
    expect(screen.queryByDisplayValue(config.minsup)).toBeTruthy();

    // Test target options    
    userEvent.click(screen.queryByText(config.target[0]))
    expect(screen.queryByText("Col2")).toBeTruthy();
    expect(screen.queryByText("Col3")).toBeTruthy();
    expect(screen.queryByText("Col4")).toBeTruthy();
    expect(screen.queryByText("Col5")).toBeTruthy();
  });

  it('should test with input and config with 2 targets (fpminer)', () => {
    const setParams = jest.fn();

    const input = [
      {
        0: {
          isAvailable: true,
          type: "action.type/FILE",
          columns: ['Col1', 'Col2', 'Col3', 'Col4', 'Col5'],
          colTypes: {
            Col1: 'Numerical', Col2: 'Numerical',
            Col3: 'Numerical', Col4: 'Numerical',
            Col5: 'Nominal'
          }
        },
        outPort: 0,
        isReady: true
      }
    ]

    const config = {
      options: {is_sample: true, nsamples: 1000},
      target: ["Col1", 'Col2'],      
      mineType: "numeric",
      method: "fpminer",
      threshold: 0.6,
      maxPattern: 100,
      holdout: 1,
      minsup: 0.01
    }
    render(<AKMineActionConfig setParams={setParams} input={input} config={config}/>);
    expect(screen.queryByText("Sample Options")).toBeTruthy();
    expect(screen.queryByText("Target")).toBeTruthy();
    expect(screen.queryByText("Mine Type")).toBeTruthy();
    expect(screen.queryByText("Max Pattern")).toBeTruthy();
    expect(screen.queryByText("Threshold")).toBeTruthy();
    expect(screen.queryByText("Holdout")).toBeTruthy();
    expect(screen.queryByText("Min. Pattern Size")).toBeTruthy();

    // Test all values in config are rendered
    expect(screen.queryByText(config.target[0])).toBeTruthy();
    expect(screen.queryByText(config.target[1])).toBeTruthy();
    expect(screen.queryByText("Numeric")).toBeTruthy();
    expect(screen.queryByDisplayValue(config.threshold)).toBeTruthy();
    expect(screen.queryByDisplayValue(config.maxPattern)).toBeTruthy();
    expect(screen.queryByDisplayValue(config.holdout)).toBeTruthy();
    expect(screen.queryByDisplayValue(config.minsup)).toBeTruthy();

    // Test target options    
    userEvent.click(screen.queryByText(config.target[1]))
    expect(screen.queryByText("Col3")).toBeTruthy();
    expect(screen.queryByText("Col4")).toBeTruthy();
    expect(screen.queryByText("Col5")).toBeTruthy();
  });

  it('should test with input and config (bayesian)', () => {
    const setParams = jest.fn();

    const input = [
      {
        0: {
          isAvailable: true,
          type: "action.type/FILE",
          columns: ['Col1', 'Col2', 'Col3', 'Col4', 'Col5'],
          colTypes: {
            Col1: 'Numerical', Col2: 'Numerical',
            Col3: 'Numerical', Col4: 'Numerical',
            Col5: 'Nominal'
          }
        },
        outPort: 0,
        isReady: true
      }
    ]

    const config = {
      options: {is_sample: true, nsamples: 1000},
      target: ["Col1"],      
      mineType: "numeric",
      method: "bayesian",
      nmodels: 10,
      niter: 1000,
      nburn: 250
    }
    render(<AKMineActionConfig setParams={setParams} input={input} config={config}/>);
    expect(screen.queryByText("Sample Options")).toBeTruthy();
    expect(screen.queryByText("Target")).toBeTruthy();
    expect(screen.queryByText("Mine Type")).toBeTruthy();
    expect(screen.queryByText("Num. Models")).toBeTruthy();
    expect(screen.queryByText("Num. Iterations")).toBeTruthy();
    expect(screen.queryByText("Num. Burn In")).toBeTruthy();

    // Test all values in config are rendered
    expect(screen.queryByText(config.target[0])).toBeTruthy();
    expect(screen.queryByText("Numeric")).toBeTruthy();
    expect(screen.queryByDisplayValue(config.nmodels)).toBeTruthy();
    expect(screen.queryByDisplayValue(config.nburn)).toBeTruthy();

    // Test target options    
    userEvent.click(screen.queryByText(config.target[0]))
    expect(screen.queryByText("Col2")).toBeTruthy();
    expect(screen.queryByText("Col3")).toBeTruthy();
    expect(screen.queryByText("Col4")).toBeTruthy();
    expect(screen.queryByText("Col5")).toBeTruthy();
  });

});
