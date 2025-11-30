import React from 'react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="dashboard-layout">
            {/* You can add a sidebar or header here */}
            <main>{children}</main>
        </div>
    );
}