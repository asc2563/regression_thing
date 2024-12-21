import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../App";

describe("App", () => {
    it("renders hello world text", () => {
        render(<App />);
        expect(screen.getByText("Hello World!")).toBeInTheDocument();
    });

    it("renders all numbers from array", () => {
        render(<App />);
        const numbers = [1, 2, 3];
        numbers.forEach((number) => {
            expect(screen.getByText(String(number))).toBeInTheDocument();
        });
    });

    it("renders correct number of paragraphs", () => {
        render(<App />);
        const paragraphs = screen.queryAllByText(/[1-3]/);
        expect(paragraphs).toHaveLength(3);
    });
});
