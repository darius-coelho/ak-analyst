import React from 'react';

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";
import userEvent from '@testing-library/user-event';

import SplitDataActionConfig from '../components/SplitDataActionConfig';

describe("Split Data action config panel", () => {

  it('should test with input and config (Random)', () => {
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
      sizeType: "Percentage",
      sizeValue: 10,
      method: "Random"
    }

    render(<SplitDataActionConfig setParams={setParams} input={input} config={config}/>);
    
    expect(screen.queryByText("Method")).toBeTruthy();
    expect(screen.queryByText("First Split Percentage")).toBeTruthy();
    

    // Test all values in config are rendered
    expect(screen.queryByText(config.method)).toBeTruthy();
    expect(screen.queryByDisplayValue(config.sizeValue)).toBeTruthy();

    // Test Method options    
    userEvent.click(screen.queryByText(config.method))
    expect(screen.queryByText("In Order")).toBeTruthy();
  });

  it('should test with input and config (InOrder)', () => {
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
      sizeType: "Absolute Count",
      sizeValue: 10,
      method: "InOrder"
    }

    render(<SplitDataActionConfig setParams={setParams} input={input} config={config}/>);
    
    expect(screen.queryByText("Method")).toBeTruthy();    
    expect(screen.getAllByText("Absolute Count").length).toBe(2)

    // Test all values in config are rendered
    expect(screen.queryByText("In Order")).toBeTruthy();
    expect(screen.queryByDisplayValue(config.sizeValue)).toBeTruthy();

    // Test Method options    
    userEvent.click(screen.queryByText("In Order"))
    expect(screen.queryByText("Random")).toBeTruthy();

    // Test sizeType options    
    userEvent.click(screen.getAllByText("Absolute Count")[0])
    expect(screen.queryByText("Percentage")).toBeTruthy();
  });

});
