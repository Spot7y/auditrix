interface Props {
  rows: any[];
}

export default function ImportPreview({
  rows,
}: Props) {

  if (rows.length === 0) {
    return null;
  }

  return (
    <div
      className="
      rounded-xl
      border
      p-4
      overflow-x-auto
      "
    >
      <h2
        className="
        text-lg
        font-semibold
        mb-4
        "
      >
        Import Preview
      </h2>

      <table
        className="
        w-full
        text-sm
        "
      >
        <thead>

          <tr
            className="
            border-b
            "
          >
            {Object.keys(
              rows[0],
            ).map(
              (key) => (
                <th
                  key={key}
                  className="
                  text-left
                  p-2
                  "
                >
                  {key}
                </th>
              ),
            )}
          </tr>

        </thead>

        <tbody>

          {rows.map(
            (row, index) => (

              <tr
                key={index}
                className="
                border-b
                "
              >
                {Object.values(
                  row,
                ).map(
                  (
                    value,
                    i,
                  ) => (

                    <td
                      key={i}
                      className="
                      p-2
                      "
                    >
                      {
                        String(
                          value,
                        )
                      }
                    </td>

                  ),
                )}
              </tr>

            ),
          )}

        </tbody>
      </table>
    </div>
  );
}