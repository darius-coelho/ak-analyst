import React from 'react';
import { min, max } from "d3";
import ScatterPlot from '../../../components/patternBrowserCard/charts/ScatterPlot';

import {render, cleanup, screen } from "@testing-library/react";

describe("Test for Card Interface Scatterplot", () => {
  afterEach(cleanup);

  it("should test the numerical X scatterplot", () => {

    const inData = [
      { attr_0: 8, attr_2: 4 },
      { attr_0: 3, attr_2: 7 },
      { attr_0: 1, attr_2: 10 },
      { attr_0: 9, attr_2: 8 },
      { attr_0: 10, attr_2: 7 },
      { attr_0: 0, attr_2: 8 },
      { attr_0: 4, attr_2: 4 },
      { attr_0: 4, attr_2: 8 }
    ]

    const outData = [
      { attr_0: 0, attr_2: 1 },
      { attr_0: 0, attr_2: 6 },
      { attr_0: 8, attr_2: 9 },
      { attr_0: 10, attr_2: 1 },
      { attr_0: 3, attr_2: 9 },
      { attr_0: 6, attr_2: 3 },
      { attr_0: 8, attr_2: 7 }
    ]

    const X = 'attr_2'
    const Y = 'attr_0'

    const chartData = {
      inData: inData,
      outData: outData,
      inExtent: {
        x: [min(inData, d => d[X]), max(inData, d => d[X])],
        y: [min(inData, d => d[Y]), max(inData, d => d[Y])],
      },
      outExtent: {
        x: [min([min(inData, d => d[X]), min(outData, d => d[X])]), max([max(inData, d => d[X]), max(outData, d => d[X])])],
        y: [min([min(inData, d => d[Y]), min(outData, d => d[Y])]), max([max(inData, d => d[Y]), max(outData, d => d[Y])])],
      },
    }

    const types =  {
      attr_0: 'Numerical',
      attr_2: 'Numerical'
    }

    const { container } = render(
      <ScatterPlot
        chartData={chartData}
        types={types}
        X={X}
        Y={Y}
        filters={[]}
        showOnlyFilter={false}
        width={500}
        height={500}
        padding={50}
        xOptions={['attr_2', 'attr_1', 'attr_3', 'attr_4', 'attr_5']}
        setSelectedAttr={jest.fn()}
      />
    );

    // Check axis labels rendered
    expect(screen.queryAllByText("attr_0").length).toBe(1);

    // Check X options rendered
    expect(screen.queryAllByText("attr_2").length).toBe(1);
    expect(screen.queryAllByText("attr_1").length).toBe(1);
    expect(screen.queryAllByText("attr_3").length).toBe(1);
    expect(screen.queryAllByText("attr_4").length).toBe(1);
    expect(screen.queryAllByText("attr_5").length).toBe(1);

    // Check points rendered
    expect(container.querySelectorAll("circle").length).toBe(inData.length + outData.length);
  });

  it("should test the categorical X scatterplot", () => {

    const inData = [
      { attr_0: 8, attr_2: 'c1' },
      { attr_0: 3, attr_2: 'c1' },
      { attr_0: 1, attr_2: 'c1' },
      { attr_0: 9, attr_2: 'c1' },
      { attr_0: 10, attr_2: 'c1' }
    ]

    const outData = [
      { attr_0: 0, attr_2: 'c1' },
      { attr_0: 4, attr_2: 'c1' },
      { attr_0: 4, attr_2: 'c2' },
      { attr_0: 1, attr_2: 'c2' },
      { attr_0: 0, attr_2: 'c2' },
      { attr_0: 8, attr_2: 'c2' },
      { attr_0: 10, attr_2: 'c2' },
      { attr_0: 3, attr_2: 'c2' },
      { attr_0: 6, attr_2: 'c2' },
      { attr_0: 8, attr_2: 'c2' }
    ]

    const X = 'attr_2'
    const Y = 'attr_0'

    const chartData = {
      inData: inData,
      outData: outData,
      inExtent: {
        x: ['c1', 'c2'],
        y: [min(inData, d => d[Y]), max(inData, d => d[Y])],
      },
      outExtent: {
        x: ['c1', 'c2'],
        y: [min([min(inData, d => d[Y]), min(outData, d => d[Y])]), max([max(inData, d => d[Y]), max(outData, d => d[Y])])],
      },
    }

    const types =  {
      attr_0: 'Numerical',
      attr_2: 'Categorical'
    }

    const { container } = render(
      <ScatterPlot
        chartData={chartData}
        types={types}
        X={X}
        Y={Y}
        filters={[]}
        showOnlyFilter={false}
        width={500}
        height={500}
        padding={50}
        xOptions={['attr_2', 'attr_1', 'attr_3', 'attr_4', 'attr_5']}
        setSelectedAttr={jest.fn()}
      />
    );

    // Check axis labels rendered
    expect(screen.queryAllByText("attr_0").length).toBe(1);

    // Check X options rendered
    expect(screen.queryAllByText("attr_2").length).toBe(1);
    expect(screen.queryAllByText("attr_1").length).toBe(1);
    expect(screen.queryAllByText("attr_3").length).toBe(1);
    expect(screen.queryAllByText("attr_4").length).toBe(1);
    expect(screen.queryAllByText("attr_5").length).toBe(1);

    // Check points rendered
    expect(container.querySelectorAll("circle").length).toBe(inData.length + outData.length);

    // Check category labels rendered
    expect(screen.queryAllByText("c1").length).toBe(2);
    expect(screen.queryAllByText("c2").length).toBe(2);
  });
});
