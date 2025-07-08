import React from 'react';
import StatusBar from '../../components/patternBrowserCard/StatusBar';

import { render, cleanup, screen } from "@testing-library/react";

describe("Test for Card Interface status bar", () => {
  afterEach(cleanup);

  it("should test the initial state", () => {
    const props = {
      targets: ["Test_target_1", "Test_target_2", "Test_target_3"],
      selectedTarget: "Test_target_2",
      targetType: 'numeric',
      dataCount: 100,
      featureCount: 23,
      patternCount: 14
    };

    render(<StatusBar {...props} />);
    
    // Test options rendered
    expect(screen.queryByText("Test_target_1")).toBeTruthy();
    expect(screen.queryByText("Test_target_2")).toBeTruthy();
    expect(screen.queryByText("Test_target_3")).toBeTruthy();

    // Test correct option selected
    expect(screen.getByDisplayValue("Test_target_2")).toBeTruthy();

    // Test remaining values rendered
    expect(screen.queryByText("(numeric)")).toBeTruthy();
    expect(screen.queryByText("100")).toBeTruthy();
    expect(screen.queryByText("23")).toBeTruthy();
    expect(screen.queryByText("14")).toBeTruthy();
  });
});
