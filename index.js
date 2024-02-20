const fs = require('fs');

const tokenName = process.argv.slice(2)
if (tokenName.length === 0) {
    console.error('Please provide token name as the last parameter (bun run run <token-name>)')
    process.exit()
}

const token = process.env[tokenName]
if (!token) {
    console.error('Token not found. Please check if token exists in .env file')
    process.exit()
}

const headers = {
    "Accept": "application/json",
    "X-Api-Token": token,
}
const listReports = async () => {
    const fetchReports = await fetch('https://dmarc.postmarkapp.com/records/my/reports?reverse=true&from_data=2024-02-12', {
        headers: headers
    })
    return await fetchReports.json()
}

const getReport = async (id) => {
    const fetchReport = await fetch(`https://dmarc.postmarkapp.com/records/my/reports/${id}`, {
        headers: headers
    })
    return await fetchReport.json()
}

const getAllReports = async () => {
    const reports = await listReports()
    let json = []
    for await (const report of reports.entries) {
        const reportData = await getReport(report.id)
        json.push(reportData)
    }
    fs.writeFileSync('./output/reports.json', JSON.stringify(json, null, 2), 'utf8')
    console.info('> reports written to ./output/reports--filtered.json')
    filterReports()
}

const filterReports = async () => {
    let reports = JSON.parse(fs.readFileSync('./output/reports.json', 'utf8'))
    for await (const report of reports) {
        // console.debug(report.records)
        report.records = report.records.filter(record => 
            (record.spf_result !== 'pass' || record.policy_evaluated_spf !== 'pass') &&
            (record.dkim_result !== 'pass' || record.policy_evaluated_dkim !== 'pass')
            )
        report.records = report.records.filter(record => 
            record.top_private_domain_name !== 'cloud-sec-av.com' &&
            record.spf_domain !== 'calendar-server.bounces.google.com' &&
            record.host_name?.indexOf('outbound.protection.outlook.com') === -1
            )
    }
    reports = reports.filter((report) => report.records.length > 0)
    fs.writeFileSync('./output/reports--filtered.json', JSON.stringify(reports, null, 2), 'utf8')
    console.info('> filtered reports written to ./output/reports--filtered.json')
}

getAllReports()