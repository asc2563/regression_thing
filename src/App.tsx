const array: number[] = [1, 2, 3];
export default function App(): React.JSX.Element {
    return (
        <div>
            <h1>Hello World! </h1>
            {array.map((item) => (
                <p>{item}</p>
            ))}
        </div>
    );
}
