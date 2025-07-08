import React from 'react';
import ColumnChart from '../../../components/patternBrowserCard/charts/ColumnChart';

import {render, cleanup, screen } from "@testing-library/react";

describe("Test for Card Interface Column Chart", () => {
  afterEach(cleanup);

  it("should test the initial state", () => {
    
    const chartData = {
      categories: ['c1', 'c2', 'c3'],
      classes: ["0", "1"],
      inData: {
        0: [2, 0, 0],
        1: [8, 0, 0],
      },
      outData:  {
        0: [10, 10, 10],
        1: [10, 10, 10],
      },
    }

    const X='attr_2'
    const Y='attr_0'         
    
    const { container } = render(
      <ColumnChart
        data={chartData}
        X={X}
        Y={Y}
        catLabels={{'attr_2': ['c1', 'c2', 'c3']}}
        filters={[]}
        showOnlyFilter={false}
        width={500}
        height={500}
        padding={50}
        xOptions={['attr_2', 'attr_1', 'attr_3', 'attr_4', 'attr_5']}
        setSelectedAttr={jest.fn()}
    />);    
    
    // Check axis labels rendered
    expect(screen.queryAllByText("Count").length).toBe(1);
    
    // Check X options rendered
    expect(screen.queryAllByText("attr_2").length).toBe(1);
    expect(screen.queryAllByText("attr_1").length).toBe(1);
    expect(screen.queryAllByText("attr_3").length).toBe(1);
    expect(screen.queryAllByText("attr_4").length).toBe(1);
    expect(screen.queryAllByText("attr_5").length).toBe(1);

    // Check catergories labels rendered
    expect(screen.queryAllByText("c1").length).toBe(2);
    expect(screen.queryAllByText("c2").length).toBe(2);
    expect(screen.queryAllByText("c3").length).toBe(2);

    // Check foreground and background columns rendered for c1 and c2 and but not c3
    // and 2 for the legend
    expect(container.querySelectorAll("rect").length).toBe((chartData.categories.length-1)*4 +2);

    // Check target name rendered for legend
    expect(screen.queryAllByText("attr_0").length).toBe(1);
  });
});
