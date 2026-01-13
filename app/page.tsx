
import SessionSidebar from './components/SessionSidebar'
import ChatHeader from './components/ChatHeader'
import MessageList from './components/MessageList'
import ChatInput from './components/ChatInput'

export default function ChatPage() {
  return (
    <main className="flex-1 flex flex-row relative h-full overflow-hidden">
      {/* 左侧会话历史侧边栏 */}
      <SessionSidebar />

      {/* 右侧主体内容区域 */}
      <div className={`flex-1 flex z-10 overflow-hidden relative h-full`}>
        {/* 顶部导航栏 */}
        <ChatHeader />

        <div className="flex-1 flex flex-col relative overflow-hidden">
          <div
            className="flex-1 overflow-y-auto scrollbar-hide scroll-smooth flex flex-col z-10 pb-32"
            id="chat-container"
          >
            {/* 消息列表 */}
            <MessageList />
          </div>

          {/* 消息输入框 */}
          <div className="absolute bottom-8 left-0 right-0 px-4 md:px-8 flex justify-center z-30">
            <ChatInput />
          </div>
        </div>
      </div>
    </main>
  )
}
