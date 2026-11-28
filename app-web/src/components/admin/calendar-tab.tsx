import { CalendarAdminEditor } from "../calendar-admin-editor.js";

/** The Calendar tab wraps the existing calendar editor (accounts-and-admin
 * capability: the surface is relocated, unchanged). */
export function CalendarTab() {
  return (
    <section>
      <CalendarAdminEditor />
    </section>
  );
}
