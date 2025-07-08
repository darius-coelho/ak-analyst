import React from 'react';
import Aggregator from '../components/aggregator/Aggregator';

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";
import userEvent from '@testing-library/user-event';

jest.mock('mixpanel-browser');

describe("Test for Aggregator Interface", () => {
  afterEach(cleanup);

  it("should test the initial state", () => {
    const pathTo = jest.fn();
    const setParams = jest.fn();
    const setOutput = jest.fn();
    const processOutput = jest.fn();
    const onHideAggregator = jest.fn();
    const handleNodeError = jest.fn();

    const props = {
      config:{
        attr: null,
        aggKey: null,
        aggMap: [],
      },
      input: {
        0: {
          columns: ['a', 'b', 'c'],
          colTypes: {a: "Numerical", b: "Numerical", c: "Nominal"},
        },
        outPort: 0
      },
      output: [null],
      pathTo,
      setParams,
      setOutput,
      processOutput,
      onHideAggregator,
      handleNodeError,
    }

    render(<Aggregator {...props} />);

    // Get react-select components
    const selectAttrInput = document.querySelector('.selectAttr input')
    const selectAttrControl = document.querySelector('.selectAttr__control')
  
    // Check react-select components
    expect(selectAttrInput).toBeTruthy();
    expect(selectAttrControl).toBeTruthy();

    // Select category a
    selectAttrInput.focus()
    userEvent.click(selectAttrControl)
    userEvent.click(screen.queryByText("a"))

    expect(screen.queryByText("Mean")).toBeTruthy();
    expect(screen.queryByText("b")).toBeTruthy();
    expect(screen.queryByText("Most Frequent")).toBeTruthy();
    expect(screen.queryByText("c")).toBeTruthy();
  });

  it("should test the state with config and output", () => {
    const pathTo = jest.fn();
    const setParams = jest.fn();
    const setOutput = jest.fn();
    const processOutput = jest.fn();
    const onHideAggregator = jest.fn();
    const handleNodeError = jest.fn();

    const props = {
      config:{
        aggKey: "c",
        aggMap: [
          {
            aggFunc: {value: "mean", label: "Mean", type: "Numerical"},
            attrs: [
              { label: "a", value: "a", type: "Numerical" },
              { label: "b", value: "b", type: "Numerical" }
            ],
            bind: []
          },
          {
            aggFunc: {value: "max_count", label: "Most Frequent", type: "Nominal"},
            attrs: [
              { label: "d", value: "d", type: "Nominal" }
            ],
            bind: []
          }
        ],
        
        aggType: {
          a: "mean",
          b: "mean"
        }
      },
      input: {
        0: {
          columns: ['a', 'b', 'c', 'd'],
          colTypes: {a: "Numerical", b: "Numerical", c: "Nominal", d: "Nominal"},
        },
        outPort: 0
      },
      output: [
        {
          preview: [
            {'a_mean': 1, 'b_mean': 2, 'c': 'x', 'd_max_count': 3},
            {'a_mean': 2, 'b_mean': 3, 'c': 'y', 'd_max_count': 4},
            {'a_mean': 3, 'b_mean': 4, 'c': 'z', 'd_max_count': 5},
          ]
        }
      ],
      pathTo,
      setParams,
      setOutput,
      processOutput,
      onHideAggregator,
      handleNodeError
    }

    render(<Aggregator {...props} />);

    // Check Key attr rendered
    const selectAttrInput = document.querySelector('.selectAttr input')
    expect(selectAttrInput).toBeTruthy();
    
    // Check mapping rendered
    expect(screen.queryByText("Mean")).toBeTruthy();
    expect(screen.queryByText("a")).toBeTruthy();
    expect(screen.queryByText("b")).toBeTruthy();
    expect(screen.queryByText("Most Frequent")).toBeTruthy();
    expect(screen.queryByText("d")).toBeTruthy();

    // Table
    expect(screen.queryByText("a_mean")).toBeTruthy();
    expect(screen.queryByText("b_mean")).toBeTruthy();
    expect(screen.queryByText("d_max_count")).toBeTruthy();
    expect(screen.queryByText("x")).toBeTruthy();
    expect(screen.queryByText("y")).toBeTruthy();
    expect(screen.queryByText("z")).toBeTruthy();
  });
});
