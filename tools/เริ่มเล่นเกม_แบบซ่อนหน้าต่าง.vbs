Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
ProjectDir = FSO.GetParentFolderName(ScriptDir)
WshShell.CurrentDirectory = ProjectDir

NodeCmd = "node"
If FSO.FileExists(ProjectDir & "\bin\node.exe") Then
    NodeCmd = """" & ProjectDir & "\bin\node.exe"""
End If

' Run Node.js Server in background with hidden window (0) and open browser
WshShell.Run "cmd.exe /c " & NodeCmd & " server.js --open", 0, False