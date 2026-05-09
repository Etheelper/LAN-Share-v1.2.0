using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Net;
using System.Net.Sockets;

class Program
{
    static void Main()
    {
        string appDir = Path.GetDirectoryName(System.Reflection.Assembly.GetEntryAssembly().Location);
        string pythonExe = Path.Combine(appDir, "python", "python.exe");
        string runPy = Path.Combine(appDir, "backend", "run.py");

        Console.Title = "LAN Share - 局域网资源共享";
        Console.OutputEncoding = System.Text.Encoding.UTF8;

        Console.WriteLine("══════════════════════════════════════════════════");
        Console.WriteLine("  LAN Share 局域网资源共享系统");
        Console.WriteLine("══════════════════════════════════════════════════");
        Console.WriteLine();

        if (!File.Exists(pythonExe))
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("错误: 找不到 Python: " + pythonExe);
            Console.WriteLine("请重新安装 LAN Share");
            Console.ResetColor();
            Console.ReadLine();
            return;
        }

        if (!File.Exists(runPy))
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("错误: 找不到启动脚本: " + runPy);
            Console.WriteLine("请重新安装 LAN Share");
            Console.ResetColor();
            Console.ReadLine();
            return;
        }

        try
        {
            var psi = new ProcessStartInfo();
            psi.FileName = pythonExe;
            psi.Arguments = "\"" + runPy + "\"";
            psi.WorkingDirectory = Path.GetDirectoryName(runPy);
            psi.UseShellExecute = false;
            psi.RedirectStandardOutput = false;
            psi.RedirectStandardError = false;
            psi.CreateNoWindow = false;

            Console.WriteLine("正在启动服务...");
            Console.WriteLine("访问地址: http://localhost:8000");
            Console.WriteLine("按 Ctrl+C 停止服务");
            Console.WriteLine();

            var process = Process.Start(psi);
            if (process != null)
            {
                process.WaitForExit();
            }
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("启动失败: " + ex.Message);
            Console.ResetColor();
            Console.ReadLine();
        }
    }
}
