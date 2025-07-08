import React from 'react';

import { JoinActionConfig } from '../components/JoinActionConfig';
import { createFileOutput, FILE } from '../../graph/components/Action.prototype';

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";
import userEvent from '@testing-library/user-event';

window.setImmediate = window.setTimeout;

describe("join action config panel", () => {
  afterEach(cleanup);

  it('should test initial state (2 connections with uploaded files)', () => {
    const setParams = jest.fn();
    const file1 = {
      name: "file1.csv",
      path: "./file1.csv",
      columns: ['a', 'b', 'c'],
      preview: [{'a': 1, 'b': 2, 'c': 3}]
    };
    
    const file2 = {
      name: "file2.csv",
      path: "./file2.csv",
      columns: ['a1', 'b1', 'c1'],
      preview: [{'a1': 1, 'b1': 2, 'c1': 3}]
    };

    const fileOutput1 = createFileOutput(file1);
    const fileOutput2 = createFileOutput(file2);    

    const input = [
      {
        0: fileOutput1,
        outPort: 0,
        isReady: true
      },
      {
        0: fileOutput2,
        outPort: 0,
        isReady: true
      }
    ]

    const config = {
      how: "left",
      join: [[null, null]],
      suffix: ["_x", "_y"]
    }

    render(<JoinActionConfig input={input} {...config} setParams={setParams}/>);    
    expect(screen.queryAllByText(/file1.csv/i).length).toBe(2);
    expect(screen.queryAllByText(/file2.csv/i).length).toBe(2);
    
  });

  it('should test interactions', () => {
    const setParams = jest.fn();
    
    const file1 = {
      name: "file1.csv",
      path: "./file1.csv",
      columns: ['a', 'b', 'c'],
      preview: [{'a': 1, 'b': 2, 'c': 3}],
    };
    
    const file2 = {
      name: "file2.csv",
      path: "./file2.csv",
      columns: ['a1', 'b1', 'c1'],
      preview: [{'a1': 1, 'b1': 2, 'c1': 3}],
    };

    const fileOutput1 = createFileOutput(file1);
    const fileOutput2 = createFileOutput(file2);

    const input = [
      {
        0: fileOutput1,
        outPort: 0,
        isReady: true
      },
      {
        0: fileOutput2,
        outPort: 0,
        isReady: true
      }
    ]

    const config = {
      how: "left",
      join: [[null, null]],
      suffix: ["_left", "_right"]
    }

    render(<JoinActionConfig input={input} {...config} setParams={setParams}/>);
    
    expect(screen.queryAllByText(/file1.csv/i).length).toBe(2);
    expect(screen.queryAllByText(/file2.csv/i).length).toBe(2);
    
    expect(screen.queryAllByText("Select...")).toHaveLength(2);
    const selectArr = screen.getAllByText("Select...");

    expect(screen.queryByText("a")).toBeNull();
    userEvent.click(selectArr[0]);
    expect(screen.queryByText("a")).toBeTruthy();    
    expect(screen.queryByText("b")).toBeTruthy();

    expect(setParams).toHaveBeenCalledTimes(0);

    userEvent.click(screen.getByText("a"));
    expect(setParams).toHaveBeenCalledTimes(1);
    expect(setParams.mock.calls[0][0]).toEqual({
      ...config,
      join: [['a', null]]
    });

    // test the radio buttons
    expect(screen.queryByDisplayValue("left")).toBeTruthy();
    expect(screen.queryByDisplayValue("right")).toBeTruthy();
    expect(screen.queryByDisplayValue("inner")).toBeTruthy();
    expect(screen.queryByDisplayValue("outer")).toBeTruthy();

    userEvent.click(screen.getByDisplayValue("inner"));
    expect(setParams).toHaveBeenCalledTimes(2);

    expect(setParams.mock.calls[1][0]).toEqual({
      ...config,
      join: [['a', null]],
      how: 'inner'
    });
    
    // test suffix displayed
    expect(screen.queryByDisplayValue("_left")).toBeTruthy();
    expect(screen.queryByDisplayValue("_right")).toBeTruthy();

  });
});
