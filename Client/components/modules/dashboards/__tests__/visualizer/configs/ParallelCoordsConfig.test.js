import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';

import ParallelCoordsConfig from "../../../components/visualizer/configs/ParallelCoordsConfig"

import { render, cleanup, screen } from "@testing-library/react";

describe("Test Parallel Coordinates Configurator", () => {
  afterEach(cleanup);

  it("should test the state", () => {
    const setChartConfig = jest.fn();

    const props = {
      columns: ['col-1', 'col-2', 'col-3', 'col-4', 'col-5', 'col-6'],
      types: {
        'col-1': 'Nominal',
        'col-2': 'Nominal',
        'col-3': 'Numerical',
        'col-4': 'Numerical',
        'col-5': 'Ordinal',
        'col-6': 'Numerical',
      },
      config: {
        chart: 'Parallel Coordinates',
        attrs: ['col-1', 'col-3'],
        lineColor: "#08519c",
        lineThickness: 3,
      },
      setChartConfig
    };

    render(<ParallelCoordsConfig {...props} />);
    
    expect(screen.queryByText("Parallel Coordinates Options")).toBeTruthy();
    expect(screen.queryByText("Attributes")).toBeTruthy();

    // Ensure selected attributes are rendered
    expect(screen.queryByText('col-1')).toBeTruthy();
    expect(screen.queryByText('col-3')).toBeTruthy();
    // Ensure other attributes are not rendered
    expect(screen.queryByText('col-2')).toBeFalsy();
    expect(screen.queryByText('col-4')).toBeFalsy();
    expect(screen.queryByText('col-5')).toBeFalsy();
    expect(screen.queryByText('col-6')).toBeFalsy();

    expect(screen.queryByText("Line Color")).toBeTruthy();
    expect(screen.queryByText("Line Thickness")).toBeTruthy();
    expect(document.querySelector(`input[name="lineThickness"]`).value).toEqual('3')
  });
});
