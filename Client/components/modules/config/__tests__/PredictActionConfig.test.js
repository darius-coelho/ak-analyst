import React from 'react';

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";
import userEvent from '@testing-library/user-event';

import { PredictActionConfig } from '../components/PredictActionConfig';


describe("Predict action config panel", () => {

  it('should test initial state regressor', () => {
    const setParams = jest.fn();
    const config = {
      includeResiduals: true,
      includeProbabilty: true,
      outputColumns: ['b', 'c']
    };
    
    const isReady = true;

    const getNodeByID = () => ({config: {target: 'b'} });
    const input = [{0: {columns: ['a', 'b', 'c']}, isReady: true},
		   {0: {modelType: 'regressor', predictors: ['a', 'b', 'c']}, isReady: true}];    

    render(<PredictActionConfig {...{isReady, setParams, input, config, getNodeByID}} />);

    expect(screen.queryByText(/Include Residuals/i)).toBeTruthy();
    expect(screen.queryByText(/Include Target/i)).toBeTruthy();
    expect(screen.queryByText(/Include Probabilty/i)).toBeNull();
    expect(screen.queryByText(/Add Predictors to Output/i)).toBeTruthy();

    // 'a' is not included in the outputColumns
    expect(screen.queryByText('a')).toBeNull();
    
    expect(screen.queryByText('b')).toBeTruthy();
    expect(screen.queryByText('c')).toBeTruthy();    
  });

  
  it('should test initial state classifier', () => {
    const setParams = jest.fn();
    const config = {
      includeResiduals: true,
      includeProbabilty: true,
      outputColumns: ['a', 'b', 'c']
    };
    
    const isReady = true;
    
    const getNodeByID = () => ({config: {target: 'b'} });
    const input = [{0: {columns: ['a', 'b', 'c']}, isReady: true},
		   {0: {modelType: 'classifier', predictors: ['a', 'b', 'c']}, isReady: true}];    

    render(<PredictActionConfig {...{isReady, setParams, input, config, getNodeByID}} />);

    expect(screen.queryByText(/Include Residuals/i)).toBeNull();
    expect(screen.queryByText(/Include Target/i)).toBeTruthy();
    expect(screen.queryByText(/Include Probability/i)).toBeTruthy();

    expect(screen.queryByText(/Add Predictors to Output/i)).toBeTruthy();

    expect(screen.queryByText('a')).toBeTruthy();
    expect(screen.queryByText('b')).toBeTruthy();
    expect(screen.queryByText('c')).toBeTruthy();    
  });

})
