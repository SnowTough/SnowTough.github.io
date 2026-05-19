#!/usr/bin/env node

/**
 * Sync cron job status to GitHub Pages
 * Reads data/cron.json and generates an HTML status page
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE = '/Users/snowf/.openclaw/workspace';
const CRON_DATA_PATH = path.join(WORKSPACE, 'data', 'cron.json');
const PAGES_REPO = path.join(WORKSPACE, 'SnowTough.github.io');
const STATUS_PAGE_PATH = path.join(PAGES_REPO, 'status.html');

function generateStatusPage(data) {
  const { jobs, updatedAt, updatedAtISO } = data;
  
  const statusRows = jobs.map(job => {
    const status = job.state.lastRunStatus;
    const statusClass = status === 'ok' ? 'status-ok' : 'status-error';
    const statusText = status === 'ok' ? '✅ 正常' : '❌ 错误';
    
    const lastRun = job.state.lastRunAtMs 
      ? new Date(job.state.lastRunAtMs).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
      : '从未运行';
    
    const nextRun = job.state.nextRunAtMs
      ? new Date(job.state.nextRunAtMs).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
      : '-';
    
    const duration = job.state.lastDurationMs 
      ? `${Math.round(job.state.lastDurationMs / 1000)}s`
      : '-';
    
    const errorInfo = job.state.lastError ? `<br><small style="color:#e53e3e">${job.state.lastError}</small>` : '';
    const enabledBadge = job.enabled ? '' : '<span style="color:#718096"> [已禁用]</span>';
    
    return `
    <tr class="${statusClass}">
      <td>${job.name}${enabledBadge}</td>
      <td>${statusText}</td>
      <td>${lastRun}</td>
      <td>${duration}</td>
      <td>${nextRun}${errorInfo}</td>
    </tr>`;
  }).join('');

  const okCount = jobs.filter(j => j.state.lastRunStatus === 'ok').length;
  const errorCount = jobs.filter(j => j.state.lastRunStatus === 'error').length;
  const enabledCount = jobs.filter(j => j.enabled).length;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cron 任务状态</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f7fafc;
    }
    h1 { color: #2d3748; }
    .summary {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }
    .summary-card {
      background: white;
      padding: 15px 25px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .summary-card .num { font-size: 2em; font-weight: bold; }
    .summary-card .label { color: #718096; font-size: 0.9em; }
    .ok .num { color: #38a169; }
    .error .num { color: #e53e3e; }
    table {
      width: 100%;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border-collapse: collapse;
    }
    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #edf2f7;
    }
    th { background: #edf2f7; font-weight: 600; color: #4a5568; }
    .status-ok { background: #f0fff4; }
    .status-error { background: #fff5f5; }
    .updated { color: #718096; font-size: 0.9em; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>🤖 Cron 任务状态</h1>
  
  <div class="summary">
    <div class="summary-card ok">
      <div class="num">${okCount}</div>
      <div class="label">正常运行</div>
    </div>
    <div class="summary-card error">
      <div class="num">${errorCount}</div>
      <div class="label">错误</div>
    </div>
    <div class="summary-card">
      <div class="num">${enabledCount}/${jobs.length}</div>
      <div class="label">已启用</div>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>任务名称</th>
        <th>状态</th>
        <th>上次运行</th>
        <th>耗时</th>
        <th>下次运行</th>
      </tr>
    </thead>
    <tbody>
      ${statusRows}
    </tbody>
  </table>
  
  <p class="updated">最后更新: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} (北京时间)</p>
</body>
</html>`;
}

async function main() {
  console.log('Reading cron data...');
  const cronData = JSON.parse(fs.readFileSync(CRON_DATA_PATH, 'utf8'));
  
  console.log('Generating status page...');
  const html = generateStatusPage(cronData);
  
  fs.writeFileSync(STATUS_PAGE_PATH, html);
  console.log('Written to:', STATUS_PAGE_PATH);
  
  // Git operations
  const { execSync } = require('child_process');
  
  process.chdir(PAGES_REPO);
  
  // Check if there are changes
  const status = execSync('git status --porcelain').toString();
  
  if (status.trim()) {
    console.log('Committing changes...');
    execSync('git add status.html');
    execSync('git commit -m "Update status page"');
    
    console.log('Pushing to GitHub...');
    execSync('git push origin main');
    console.log('Done!');
  } else {
    console.log('No changes to push.');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
