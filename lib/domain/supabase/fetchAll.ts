/** The most rows the Supabase API returns for one request (`max_rows` in supabase/config.toml). */
export const PAGE_SIZE = 1000;

/**
 * Every row of a query, one page at a time, since anything past the API's
 * row limit would otherwise be left out without an error. `page` builds the
 * query for a range of rows; give it a stable order (e.g. by id) so pages
 * don't overlap.
 */
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}
