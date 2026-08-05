/** Report generation, copy, and export */

let generatedReportText = '';

function generateReportText(stats) {
  const { teachersOnly, bothUploaded, noEntry, totalDeployed, enrollmentActive, total } = stats;
  const pctTeachers = total ? ((teachersOnly.length / total) * 100).toFixed(1) : 0;
  const pctBoth = total ? ((bothUploaded.length / total) * 100).toFixed(1) : 0;
  const pctNoEntry = total ? ((noEntry.length / total) * 100).toFixed(1) : 0;
  const pctDeployed = total ? ((totalDeployed / total) * 100).toFixed(1) : 0;
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return `SAVVY Deployment Status Report
S.Y ${APP_CONFIG.schoolYear}
As of ${dateStr}

Summary:
Total Sites: ${total}
Schools with Teachers Uploaded Only: ${teachersOnly.length}
Schools with Teachers and Students Uploaded: ${bothUploaded.length}
Schools with No Entry: ${noEntry.length}
Sites with Enrollment Module: ${enrollmentActive}
Deployed Sites: ${totalDeployed}
____________________________________________________________________________________

Schools with Teachers Uploaded Only
${teachersOnly.length ? teachersOnly.join('\n') : '(none)'}
Total Number of Schools: ${teachersOnly.length}
____________________________________________________________________________________

Schools with Teachers and Students Uploaded
${bothUploaded.length ? bothUploaded.join('\n') : '(none)'}
Total Number of Schools: ${bothUploaded.length}
____________________________________________________________________________________

Schools with No Entry
${noEntry.length ? noEntry.join('\n') : '(none)'}
Total Number of Schools: ${noEntry.length}
____________________________________________________________________________________

Analysis:
${pctTeachers}% of schools have completed teacher uploads only (${teachersOnly.length} out of ${total} schools).
${pctBoth}% of schools have uploaded both teachers and students (${bothUploaded.length} out of ${total} schools).
${pctNoEntry}% of schools have not yet submitted any data (${noEntry.length} out of ${total} schools).
${pctDeployed}% of target school sites have been deployed (${totalDeployed} out of ${total} schools).`;
}

function displayReport(text) {
  generatedReportText = text;
  const output = document.getElementById('report-output');
  if (output) output.innerText = text;
}

function copyReportToClipboard() {
  if (!generatedReportText) return Promise.reject(new Error('No report'));

  return navigator.clipboard.writeText(generatedReportText);
}

function downloadReportAsFile() {
  if (!generatedReportText) return;
  const date = new Date().toISOString().slice(0, 10);
  downloadFile(
    generatedReportText,
    `SAVVY-Deployment-Report-${date}.txt`,
    'text/plain'
  );
}

function generateHandlerSummary(schools) {
  const byHandler = {};
  schools.forEach((s) => {
    const key = s.ss || 'Unassigned';
    if (!byHandler[key]) byHandler[key] = [];
    byHandler[key].push(s);
  });

  const lines = [`SS Summary (Solutions Specialist) — S.Y. ${APP_CONFIG.schoolYear}`, ''];

  Object.keys(byHandler)
    .sort()
    .forEach((handler) => {
      const list = byHandler[handler];
      const stats = calculateStats(list);
      lines.push(`${handler} (${stats.total} site${stats.total !== 1 ? 's' : ''})`);
      lines.push(`  Deployed: ${stats.totalDeployed} | Teachers Only: ${stats.teachersOnly.length} | Both: ${stats.bothUploaded.length} | No Entry: ${stats.noEntry.length}`);
      list.forEach((s) => {
        const label = s.programs ? `${s.name} — ${s.programs}` : s.name;
        const progress = [
          s.accountCreation ? 'Accounts' : null,
          s.teachers ? 'Teachers' : null,
          s.students ? 'Students' : null,
          s.enrollment ? 'Enrollment' : null,
        ].filter(Boolean).join(', ') || 'No progress';
        lines.push(`  • ${label} [${s.status}] — ${progress}`);
      });
      lines.push('');
    });

  return lines.join('\n');
}
