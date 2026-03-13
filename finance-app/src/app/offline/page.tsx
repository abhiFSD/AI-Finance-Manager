import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'You are offline - Finance App',
  description: 'You are currently offline. Some features may be limited.',
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        {/* Offline Icon */}
        <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
          <svg 
            className="w-8 h-8 text-yellow-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 19c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          You&apos;re offline
        </h1>

        {/* Description */}
        <p className="text-gray-600 mb-6">
          You&apos;re currently not connected to the internet. Some features may be limited, 
          but you can still view your cached data and make changes that will sync when you&apos;re back online.
        </p>

        {/* Available Features */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-green-800 mb-2">
            Available offline:
          </h3>
          <ul className="text-sm text-green-700 space-y-1 text-left">
            <li className="flex items-center">
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              View cached transactions
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              View account summaries
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Add transactions (will sync later)
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              View offline documentation
            </li>
          </ul>
        </div>

        {/* Connection Status */}
        <div className="border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">
            Connection Status
          </h3>
          <div id="connection-status" className="text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span>Network:</span>
              <span className="font-medium text-red-600">Offline</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span>Last sync:</span>
              <span id="last-sync" className="font-medium text-gray-500">
                Checking...
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors duration-200"
          >
            Try Again
          </button>
          
          <a
            href="/dashboard"
            className="block w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors duration-200 text-center"
          >
            Go to Dashboard
          </a>
          
          <a
            href="/transactions"
            className="block w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors duration-200 text-center"
          >
            View Transactions
          </a>
        </div>

        {/* Tips */}
        <div className="mt-6 text-xs text-gray-500">
          <p>
            <strong>Tip:</strong> Changes you make offline will automatically sync when you&apos;re back online.
          </p>
        </div>
      </div>

      {/* Background Script for Connection Monitoring */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Monitor connection status
            function updateConnectionStatus() {
              const statusElement = document.getElementById('connection-status');
              const lastSyncElement = document.getElementById('last-sync');
              
              if (navigator.onLine) {
                statusElement.innerHTML = '<div class="flex items-center justify-between"><span>Network:</span><span class="font-medium text-green-600">Online</span></div>';
                // Reload to get back to normal app
                setTimeout(() => {
                  window.location.href = '/dashboard';
                }, 1000);
              } else {
                statusElement.innerHTML = '<div class="flex items-center justify-between"><span>Network:</span><span class="font-medium text-red-600">Offline</span></div>';
              }
              
              // Update last sync time
              const lastSync = localStorage.getItem('lastSyncTime');
              if (lastSync) {
                const syncTime = new Date(parseInt(lastSync));
                const now = new Date();
                const diff = now.getTime() - syncTime.getTime();
                const minutes = Math.floor(diff / (1000 * 60));
                
                if (minutes < 1) {
                  lastSyncElement.textContent = 'Just now';
                } else if (minutes < 60) {
                  lastSyncElement.textContent = minutes + 'm ago';
                } else {
                  const hours = Math.floor(minutes / 60);
                  lastSyncElement.textContent = hours + 'h ago';
                }
              } else {
                lastSyncElement.textContent = 'Never';
              }
            }
            
            // Update status immediately and then every 5 seconds
            updateConnectionStatus();
            setInterval(updateConnectionStatus, 5000);
            
            // Listen for online/offline events
            window.addEventListener('online', updateConnectionStatus);
            window.addEventListener('offline', updateConnectionStatus);
            
            // Register service worker if not already registered
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js').catch(console.error);
            }
          `,
        }}
      />
    </div>
  );
}