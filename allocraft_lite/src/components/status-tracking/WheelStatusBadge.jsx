import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
    Activity, 
    Clock, 
    AlertTriangle, 
    CheckCircle2, 
    Pause, 
    Eye, 
    RotateCcw, 
    Shield,
    XCircle 
} from 'lucide-react';

/**
 * WheelStatusBadge - Dynamic status display component with intelligent styling
 * 
 * Provides visual status indicators with contextual colors, icons, and tooltips
 * for comprehensive wheel strategy status tracking.
 */
export default function WheelStatusBadge({ 
    status, 
    size = 'default',
    showIcon = true,
    showTooltip = true,
    className = '',
    onClick = null
}) {
    // Status configuration with colors, icons, and descriptions
    const statusConfig = {
        pending: {
            color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            icon: Clock,
            label: 'Pending',
            description: 'Wheel strategy is being set up'
        },
        active: {
            color: 'bg-green-100 text-green-800 border-green-200',
            icon: Activity,
            label: 'Active',
            description: 'Options are active and generating income'
        },
        monitoring: {
            color: 'bg-blue-100 text-blue-800 border-blue-200',
            icon: Eye,
            label: 'Monitoring',
            description: 'Watching for assignment or expiration'
        },
        assigned: {
            color: 'bg-orange-100 text-orange-800 border-orange-200',
            icon: AlertTriangle,
            label: 'Assigned',
            description: 'Put options assigned, holding shares'
        },
        rolling: {
            color: 'bg-purple-100 text-purple-800 border-purple-200',
            icon: RotateCcw,
            label: 'Rolling',
            description: 'Options being rolled to new expiration'
        },
        covered: {
            color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
            icon: Shield,
            label: 'Covered',
            description: 'Covered calls active on held shares'
        },
        expired: {
            color: 'bg-gray-100 text-gray-800 border-gray-200',
            icon: Clock,
            label: 'Expired',
            description: 'Options expired, ready for next cycle'
        },
        closed: {
            color: 'bg-slate-100 text-slate-800 border-slate-200',
            icon: CheckCircle2,
            label: 'Closed',
            description: 'Wheel strategy completed or manually closed'
        },
        paused: {
            color: 'bg-amber-100 text-amber-800 border-amber-200',
            icon: Pause,
            label: 'Paused',
            description: 'Strategy temporarily suspended'
        }
    };

    // Default to unknown status
    const config = statusConfig[status?.toLowerCase()] || {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: XCircle,
        label: status || 'Unknown',
        description: 'Unknown status'
    };

    const IconComponent = config.icon;

    // Size variants
    const sizeClasses = {
        sm: 'text-xs px-2 py-1',
        default: 'text-sm px-2.5 py-1.5',
        lg: 'text-base px-3 py-2'
    };

    const iconSizes = {
        sm: 'h-3 w-3',
        default: 'h-4 w-4',
        lg: 'h-5 w-5'
    };

    const badgeContent = (
        <Badge 
            className={`
                ${config.color} 
                ${sizeClasses[size]} 
                ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
                ${className}
                border font-medium inline-flex items-center gap-1.5
            `}
            onClick={onClick}
        >
            {showIcon && (
                <IconComponent className={`${iconSizes[size]} shrink-0`} />
            )}
            <span className="truncate">{config.label}</span>
        </Badge>
    );

    // Add tooltip if requested
    if (showTooltip) {
        return (
            <div className="relative group">
                {badgeContent}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                    <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                        {config.description}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                    </div>
                </div>
            </div>
        );
    }

    return badgeContent;
}

/**
 * Status change indicator for showing transitions
 */
export function StatusChangeIndicator({ fromStatus, toStatus, timestamp, automated = false }) {
    return (
        <div className="flex items-center gap-2 text-sm text-slate-600">
            <WheelStatusBadge status={fromStatus} size="sm" showTooltip={false} />
            <span className="text-slate-400">→</span>
            <WheelStatusBadge status={toStatus} size="sm" showTooltip={false} />
            <span className="text-xs text-slate-500">
                {automated && '(Auto) '}
                {new Date(timestamp).toLocaleTimeString()}
            </span>
        </div>
    );
}

/**
 * Status progress indicator for wheel lifecycle
 */
export function StatusProgressIndicator({ currentStatus, completedStatuses = [] }) {
    const lifecycle = ['pending', 'active', 'monitoring', 'assigned', 'covered', 'closed'];
    const currentIndex = lifecycle.indexOf(currentStatus?.toLowerCase());

    return (
        <div className="flex items-center gap-2">
            {lifecycle.map((status, index) => {
                const isCompleted = completedStatuses.includes(status);
                const isCurrent = index === currentIndex;
                const isUpcoming = index > currentIndex;

                return (
                    <div key={status} className="flex items-center">
                        <div className={`
                            w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                            ${isCurrent ? 'bg-blue-500 text-white' :
                              isCompleted ? 'bg-green-500 text-white' :
                              'bg-slate-200 text-slate-500'}
                        `}>
                            {isCompleted ? '✓' : index + 1}
                        </div>
                        {index < lifecycle.length - 1 && (
                            <div className={`
                                w-8 h-0.5 mx-1
                                ${isCompleted ? 'bg-green-500' : 'bg-slate-200'}
                            `} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
