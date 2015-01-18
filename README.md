spidey
======
![image](http://media.tumblr.com/tumblr_li2dlulq4Y1qboddt.jpg)

1. Make sure you have node installed from here : http://nodejs.org/. 

2. Go to the popeye directory and do : ```npm install```

3. To run the server as a single process do : ```node app.js``` <br>
	By default the server runs on port 8000, if you want to change the port do : ```node app.js [PORT]`` . In this case the logs are in logs/app.log

4. You can also run the server as a cluster of servers. To do that do: ```node bin/cluster.js```<br> This will bring down a number of servers that is equal to the number of CPUs, (i.e if you have an i7 mac, you will get a cluster of 8 servers). There is a master process that manages these servers and if one of them goes down, the master process brings back the slaves. In this case each server will have its own log at logs/app[number].log

5. To work with AWS , create a file at : ```~/.aws/credentials``` . In there add: <br>

	[default]<br>
	aws_access_key_id = <YOUR_ACCESS_KEY_ID><br>
	aws_secret_access_key = <YOUR_SECRET_ACCESS_KEY><br>
	
