import React from 'react';
import { HashRouter, Route, Switch } from 'react-router-dom';

import BalloonConfig from "../../../components/visualizer/configs/BalloonConfig"

import { render, cleanup, screen } from "@testing-library/react";

describe("Test Balloon Plot Configurator", () => {
  afterEach(cleanup);

  it("should test the state", () => {
    const setChartConfig = jest.fn();

    const props = {
      columns: ['col-1', 'col-2', 'col-5'],
      types: {
        'col-1': 'Nominal',
        'col-2': 'Nominal',
        'col-5': 'Ordinal',
      },
      config: {
        chart: 'Balloon',
        x: 'col-1',
        y: 'col-2',
        pointColor: "#08519c",
        rSizeMax: 21,
      },
      setChartConfig
    };

    render(<BalloonConfig {...props} />);

    expect(screen.queryByText("Balloon Chart Options")).toBeTruthy();
    expect(screen.queryByText("X Attribute")).toBeTruthy();
    expect(document.querySelector(`select[name="x"]`).value).toEqual('col-1')
    expect(screen.queryByText("Y Attribute")).toBeTruthy();
    expect(document.querySelector(`select[name="y"]`).value).toEqual('col-2')
    expect(screen.queryByText("Color")).toBeTruthy();
    expect(screen.queryByText("Max Radius")).toBeTruthy();
    expect(document.querySelector(`input[name="rSizeMax"]`).value).toEqual('21')

    // Check that nominal/ordinal attributes rendered twice as options for x & y
    expect(screen.queryAllByText('col-1').length).toEqual(2)
    expect(screen.queryAllByText('col-2').length).toEqual(2)
    expect(screen.queryAllByText('col-5').length).toEqual(2)

  });
});
