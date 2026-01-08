import { Loader2, AlertCircle, CheckCircle } from "lucide-react";

export default function AdminLogs() {
  // Placeholder for logs viewer
  const logs = [
    {
      id: 1,
      timestamp: new Date(Date.now() - 3600000),
      productId: 1,
      productName: "Pamięć Corsair Vengeance LPX",
      status: "success",
      message: "Price updated: 1559.00 zł",
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 7200000),
      productId: 2,
      productName: "Unknown Product",
      status: "error",
      message: "Failed to scrape: Product page not found",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Scraping Logs</h2>
        <p className="text-gray-600">
          View price scraping history and error details
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Message
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {log.timestamp.toLocaleString("pl-PL")}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {log.productName}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      {log.status === "success" ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-green-600 font-medium">Success</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <span className="text-red-600 font-medium">Error</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {log.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Note:</strong> Detailed logs are available for debugging purposes.
          For the admin user sigarencja@gmail.com, full error details are logged to
          the browser console.
        </p>
      </div>
    </div>
  );
}
