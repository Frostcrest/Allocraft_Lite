import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    History, 
    Clock, 
    User, 
    Bot, 
    ChevronDown, 
    ChevronUp,
    Activity,
    Filter,
    Calendar,
    ArrowRight
} from 'lucide-react';
import WheelStatusBadge, { StatusChangeIndicator } from './WheelStatusBadge';

/**
 * WheelStatusHistory - Comprehensive status history timeline component
 * 
 * Displays a chronological view of all status changes for a wheel strategy
 * with filtering, detailed metadata, and transition analysis.
 */
export default function WheelStatusHistory({ 
    wheelId, 
    statusHistory = [], 
    isLoading = false,
    onRefresh = () => {},
    compact = false 
}) {
    const [expandedEntries, setExpandedEntries] = useState(new Set());
    const [filter, setFilter] = useState('all'); // 'all', 'manual', 'automatic'
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc', 'asc'

    // Filter and sort history
    const filteredHistory = statusHistory
        .filter(entry => {
            if (filter === 'manual') return !entry.automated;
            if (filter === 'automatic') return entry.automated;
            return true;
        })
        .sort((a, b) => {
            const aTime = new Date(a.timestamp).getTime();
            const bTime = new Date(b.timestamp).getTime();
            return sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
        });

    const toggleExpanded = (entryId) => {
        const newExpanded = new Set(expandedEntries);
        if (newExpanded.has(entryId)) {
            newExpanded.delete(entryId);
        } else {
            newExpanded.add(entryId);
        }
        setExpandedEntries(newExpanded);
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return {
            date: date.toLocaleDateString(),
            time: date.toLocaleTimeString(),
            relative: getRelativeTime(date)
        };
    };

    const getRelativeTime = (date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffMs / (1000 * 60));

        if (diffDays > 0) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        if (diffHours > 0) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        return 'Just now';
    };

    const getTransitionIcon = (triggerEvent) => {
        const icons = {
            manual: User,
            assignment: ArrowRight,
            expiration: Clock,
            position_change: Activity,
            auto_detection: Bot
        };
        return icons[triggerEvent] || Activity;
    };

    const getImpactColor = (impactLevel) => {
        const colors = {
            high: 'bg-red-100 text-red-800',
            medium: 'bg-yellow-100 text-yellow-800',
            low: 'bg-green-100 text-green-800'
        };
        return colors[impactLevel] || 'bg-gray-100 text-gray-800';
    };

    if (compact) {
        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-slate-700">Recent Status Changes</h4>
                    <Button variant="ghost" size="sm" onClick={onRefresh}>
                        <History className="h-4 w-4" />
                    </Button>
                </div>
                <div className="space-y-2">
                    {filteredHistory.slice(0, 3).map((entry) => {
                        const timestamp = formatTimestamp(entry.timestamp);
                        return (
                            <div key={entry.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                                <StatusChangeIndicator
                                    fromStatus={entry.previous_status}
                                    toStatus={entry.new_status}
                                    timestamp={entry.timestamp}
                                    automated={entry.automated}
                                />
                                <span className="text-xs text-slate-500">{timestamp.relative}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Status History
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <select 
                            value={filter} 
                            onChange={(e) => setFilter(e.target.value)}
                            className="text-sm border rounded px-2 py-1"
                        >
                            <option value="all">All Changes</option>
                            <option value="manual">Manual Only</option>
                            <option value="automatic">Automatic Only</option>
                        </select>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                        >
                            <Calendar className="h-4 w-4" />
                            {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onRefresh}>
                            <History className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-slate-600">Loading history...</span>
                    </div>
                ) : filteredHistory.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <History className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                        <p>No status history available</p>
                        <p className="text-sm">Status changes will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredHistory.map((entry, index) => {
                            const timestamp = formatTimestamp(entry.timestamp);
                            const isExpanded = expandedEntries.has(entry.id);
                            const TriggerIcon = getTransitionIcon(entry.trigger_event);

                            return (
                                <div key={entry.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="flex items-center gap-2">
                                                <TriggerIcon className="h-4 w-4 text-slate-600" />
                                                <div className="flex items-center gap-2">
                                                    {entry.previous_status && (
                                                        <>
                                                            <WheelStatusBadge 
                                                                status={entry.previous_status} 
                                                                size="sm" 
                                                                showTooltip={false}
                                                            />
                                                            <ArrowRight className="h-3 w-3 text-slate-400" />
                                                        </>
                                                    )}
                                                    <WheelStatusBadge 
                                                        status={entry.new_status} 
                                                        size="sm" 
                                                        showTooltip={false}
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                {entry.automated ? (
                                                    <Badge variant="outline" className="text-xs">
                                                        <Bot className="h-3 w-3 mr-1" />
                                                        Auto
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-xs">
                                                        <User className="h-3 w-3 mr-1" />
                                                        Manual
                                                    </Badge>
                                                )}
                                                
                                                {entry.impact_level && (
                                                    <Badge className={`text-xs ${getImpactColor(entry.impact_level)}`}>
                                                        {entry.impact_level}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            <div className="text-right">
                                                <div className="text-sm font-medium">{timestamp.relative}</div>
                                                <div className="text-xs text-slate-500">{timestamp.date} {timestamp.time}</div>
                                            </div>
                                            
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                onClick={() => toggleExpanded(entry.id)}
                                            >
                                                {isExpanded ? (
                                                    <ChevronUp className="h-4 w-4" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    {isExpanded && (
                                        <div className="mt-3 pt-3 border-t space-y-2">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="font-medium text-slate-600">Trigger Event:</span>
                                                    <span className="ml-2 capitalize">{entry.trigger_event.replace('_', ' ')}</span>
                                                </div>
                                                
                                                {entry.updated_by && (
                                                    <div>
                                                        <span className="font-medium text-slate-600">Updated By:</span>
                                                        <span className="ml-2">{entry.updated_by}</span>
                                                    </div>
                                                )}
                                                
                                                {entry.transition_type && (
                                                    <div>
                                                        <span className="font-medium text-slate-600">Transition Type:</span>
                                                        <span className="ml-2 capitalize">{entry.transition_type}</span>
                                                    </div>
                                                )}
                                                
                                                {entry.duration_since && (
                                                    <div>
                                                        <span className="font-medium text-slate-600">Duration:</span>
                                                        <span className="ml-2">{entry.duration_since}</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {entry.metadata && entry.metadata !== '{}' && (
                                                <div>
                                                    <span className="font-medium text-slate-600 text-sm">Additional Details:</span>
                                                    <pre className="mt-1 p-2 bg-slate-100 rounded text-xs overflow-auto">
                                                        {typeof entry.metadata === 'string' ? entry.metadata : JSON.stringify(entry.metadata, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
