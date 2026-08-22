// frontend/src/components/chat/MessageList.tsx
import React, { useRef, useEffect, useCallback } from 'react';
import { AutoSizer, List, CellMeasurer, CellMeasurerCache } from 'react-virtualized';
import { format } from 'date-fns';
import MessageBubble from './MessageBubble';
import './MessageList.css';

interface MessageListProps {
  messages: any[];
  currentUserId: string;
}

const MessageList: React.FC<MessageListProps> = ({ messages, currentUserId }) => {
  const listRef = useRef<List>(null);
  const cacheRef = useRef(
    new CellMeasurerCache({
      fixedWidth: true,
      defaultHeight: 80,
    })
  );

  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  useEffect(() => {
    if (listRef.current && sortedMessages.length > 0) {
      listRef.current.scrollToRow(sortedMessages.length - 1);
    }
  }, [sortedMessages.length]);

  const rowRenderer = useCallback(
    ({ index, key, parent, style }) => {
      const message = sortedMessages[index];
      const isOwnMessage = message.senderId === currentUserId;
      const showTimestamp = index === 0 || 
        new Date(message.createdAt).getTime() - new Date(sortedMessages[index - 1].createdAt).getTime() > 300000;

      return (
        <CellMeasurer
          key={key}
          cache={cacheRef.current}
          parent={parent}
          columnIndex={0}
          rowIndex={index}
        >
          <div style={style} className="message-row">
            {showTimestamp && (
              <div className="message-timestamp">
                {format(new Date(message.createdAt), 'HH:mm')}
              </div>
            )}
            <MessageBubble
              message={message}
              isOwnMessage={isOwnMessage}
            />
          </div>
        </CellMeasurer>
      );
    },
    [sortedMessages, currentUserId]
  );

  if (sortedMessages.length === 0) {
    return (
      <div className="message-list empty">
        <i className="fas fa-inbox" />
        <p>No messages yet</p>
      </div>
    );
  }

  return (
    <div className="message-list">
      <AutoSizer>
        {({ width, height }) => (
          <List
            ref={listRef}
            width={width}
            height={height}
            rowCount={sortedMessages.length}
            rowHeight={cacheRef.current.rowHeight}
            rowRenderer={rowRenderer}
            deferredMeasurementCache={cacheRef.current}
            overscanRowCount={5}
            scrollToIndex={sortedMessages.length - 1}
            scrollToAlignment="end"
          />
        )}
      </AutoSizer>
    </div>
  );
};

export default MessageList;