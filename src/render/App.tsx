import React from "react";
const array: number[] = [1, 2, 3];
export default function App(): React.ReactNode {
    return (
        <div>
            <h1>Hello World!</h1>
            {array.map((item) => (
                <p className="pt-4 text-green-500" key={item}>
                    {item}
                </p>
            ))}
        </div>
    );
}
