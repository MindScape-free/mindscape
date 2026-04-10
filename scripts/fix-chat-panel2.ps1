$file = 'src\components\chat-panel.tsx'
$c = [System.IO.File]::ReadAllText($file)

# Fix 1: Add pinChatTopRef and pinChatInitializedRef after pinChatEndRef line
$old1 = "const pinChatEndRef = useRef<HTMLDivElement>(null);"
$new1 = "const pinChatTopRef = useRef<HTMLDivElement>(null);" + "`r`n" + "  const pinChatEndRef = useRef<HTMLDivElement>(null);" + "`r`n" + "  const pinChatInitializedRef = useRef(false);"
$c = $c.Replace($old1, $new1)
Write-Host ("Fix 1 applied: " + $c.Contains('pinChatTopRef'))

# Fix 2: Replace the scroll effect
$old2 = "  useEffect(() => {" + "`r`n" + "    pinChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });" + "`r`n" + "  }, [pinChatMessages, isPinChatLoading]);"
$new2 = "  useEffect(() => {" + "`r`n" + "    if (view !== 'pin-chat') return;" + "`r`n" + "    if (!pinChatInitializedRef.current) {" + "`r`n" + "      pinChatInitializedRef.current = true;" + "`r`n" + "      setTimeout(() => pinChatTopRef.current?.scrollIntoView({ behavior: 'auto' }), 30);" + "`r`n" + "    } else {" + "`r`n" + "      pinChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });" + "`r`n" + "    }" + "`r`n" + "  }, [pinChatMessages, isPinChatLoading, view]);"
$c = $c.Replace($old2, $new2)
Write-Host ("Fix 2 applied: " + $c.Contains("view !== 'pin-chat'"))

# Fix 3: Add pinChatTopRef div before Pinned origin label
$old3 = "            {/* Pinned origin label */}"
$new3 = "            <div ref={pinChatTopRef} />" + "`r`n" + "            {/* Pinned origin label */}"
$c = $c.Replace($old3, $new3)
Write-Host ("Fix 3 applied: " + $c.Contains('<div ref={pinChatTopRef}'))

# Fix 4: Add pinChatInitializedRef.current = false before setView in the Chat button onClick
$old4 = "                    setPinChatMessages(initial);" + "`r`n" + "                    pinChatInitializedRef.current = false;" + "`r`n" + "                    setView('pin-chat');"
# Check if already there (from fix 5 script which added it)
if ($c.Contains($old4)) {
    Write-Host "Fix 4 already applied"
} else {
    $old4b = "                    setPinChatMessages(initial);" + "`r`n" + "                    setView('pin-chat');"
    $new4 = "                    setPinChatMessages(initial);" + "`r`n" + "                    pinChatInitializedRef.current = false;" + "`r`n" + "                    setView('pin-chat');"
    $c = $c.Replace($old4b, $new4)
    Write-Host ("Fix 4 applied: " + $c.Contains('pinChatInitializedRef.current = false'))
}

[System.IO.File]::WriteAllText($file, $c)
Write-Host "All done"
